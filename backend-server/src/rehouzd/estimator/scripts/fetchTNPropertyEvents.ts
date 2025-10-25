import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { once } from 'events';
import path from 'path';
import crypto from 'crypto';

interface TNZipCode {
  parcl_id: number;
  name: string; // zip code
  state_abbreviation: string;
  total_population: number;
  median_income: number;
}

interface PropertyEventData {
  parcl_property_id: string;
  property_metadata: any;
  events?: any[];
}

function formatDate(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US');
}

function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getDynamicDateRange(): { minDate: string; maxDate: string } {
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(today.getFullYear() - 2);

  return {
    minDate: formatDateForAPI(twoYearsAgo),
    maxDate: formatDateForAPI(today)
  };
}

function setDbEnvFromDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  try {
    const u = new URL(url);
    process.env.DB_HOST = process.env.DB_HOST || u.hostname;
    process.env.DB_PORT = process.env.DB_PORT || (u.port || '5432');
    process.env.DB_NAME = process.env.DB_NAME || u.pathname.replace(/^\//, '');
    process.env.DB_USER = process.env.DB_USER || decodeURIComponent(u.username || '');
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || decodeURIComponent(u.password || '');
  } catch {
    // ignore parse errors; fall back to existing env
  }
}

async function ensureReportsDir(): Promise<string> {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  return reportsDir;
}

async function ensureLogsDir(): Promise<string> {
  const logsDir = path.resolve(process.cwd(), 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  return logsDir;
}

// Step 1: Fetch all TN zip codes
async function fetchTNZipCodes(parclLabsClient: any): Promise<TNZipCode[]> {
  console.log('Fetching TN zip codes from Parcl Labs API...');

  try {
    const response = await parclLabsClient.searchMarkets('ZIP5', 'TN', 1000);

    if (!response.data?.items || !Array.isArray(response.data.items)) {
      throw new Error('Invalid response format for TN zip codes');
    }

    console.log(`Found ${response.data.items.length} TN zip codes`);
    return response.data.items;

  } catch (error: any) {
    console.error('Failed to fetch TN zip codes:', error.message);
    throw error;
  }
}

// Step 2: Search for property events by zip codes (one zip code per API call with concurrency)
async function searchPropertyEventsByZipCodes(
  parclLabsClient: any,
  parclLabsRepository: any,
  zipCodes: TNZipCode[],
  batchSize: number = 1, // One zip code per API call
  concurrency: number = 8, // Fire multiple API calls in parallel
  dateRange?: { minDate: string; maxDate: string }
): Promise<{ totalProperties: number; totalEvents: number }> {
  const searchSessionId = `tn_property_events_${Date.now()}`;
  let totalPropertiesProcessed = 0;
  let totalEventsProcessed = 0;

  console.log(`Processing ${zipCodes.length} zip codes with concurrency=${concurrency}...`);
  console.log(`Filtering for property types: SINGLE_FAMILY, OTHER`);

  // Process individual zip codes with concurrency control
  let zipIndex = 0;
  let completedZips = 0;

  async function processZipCode(): Promise<void> {
    while (true) {
      const currentZipIndex = zipIndex++;
      if (currentZipIndex >= zipCodes.length) break;

      const zipCode = zipCodes[currentZipIndex];
      const zipNumber = currentZipIndex + 1;

      console.log(`Processing zip code ${zipNumber}/${zipCodes.length}: ${zipCode.name} (Parcl ID: ${zipCode.parcl_id})`);

      const searchParams = {
        parcl_ids: [zipCode.parcl_id], 
        event_filters: {
          event_names: ['SOLD', 'LISTED_RENT', 'RENTAL_PRICE_CHANGE'],
          min_event_date: dateRange?.minDate,
          max_event_date: dateRange?.maxDate
        }
      };

      try {
        // Use the new v2 property search endpoint by parcl_ids (single zip code)
        const response = await parclLabsClient.searchPropertiesWithEventsByParclIds(searchParams);

        if (response.data?.data && Array.isArray(response.data.data)) {
          const totalPropertiesFromAPI = response.data.data.length;

          // ANALYTICS: Count what would be filtered (for logging only)
          const newConstructionCount = response.data.data.filter((property: any) =>
            property.property_metadata?.year_built &&
            (property.property_metadata.year_built >= 2023 ||
            property.property_metadata.year_built != null)
          ).length;

          const missingEventsCount = response.data.data.filter((property: any) =>
            !(property.events && Array.isArray(property.events) &&
              property.events.some((event: any) =>
                ['SOLD', 'LISTED_RENT', 'PRICE_CHANGE'].includes(event.event_name)
              ))
          ).length;

          const wouldBeFilteredCount = response.data.data.filter((property: any) =>
            !(property.events && Array.isArray(property.events) &&
            property.events.some((event: any) =>
                ['SOLD', 'LISTED_RENT', 'PRICE_CHANGE'].includes(event.event_name)
              ) &&
              (!property.property_metadata?.year_built || property.property_metadata.year_built < 2023 || property.property_metadata.year_built != null))
          ).length;

          const wouldBeKeptCount = totalPropertiesFromAPI - wouldBeFilteredCount;

          console.log(`[STORAGE] API returned ${totalPropertiesFromAPI} properties - storing ALL for audit trail`);
          console.log(`[ANALYTICS] Would filter: ${wouldBeFilteredCount} properties (${newConstructionCount} new construction + ${missingEventsCount} missing events)`);
          console.log(`[ANALYTICS] Would process: ${wouldBeKeptCount} properties for transactions`);

          // STORE ALL PROPERTIES (complete audit trail)
          if (totalPropertiesFromAPI > 0) {
            await saveAllZipCodeDataToDatabase(response.data.data, parclLabsRepository, searchSessionId, zipCode.parcl_id);

            const totalEventsInZip = response.data.data.reduce((sum: number, prop: any) => sum + (prop.events?.length || 0), 0);
            totalPropertiesProcessed += totalPropertiesFromAPI; // Count all properties stored
            totalEventsProcessed += totalEventsInZip;

            console.log(`[SUCCESS] Zip ${zipCode.name}: Stored ${totalPropertiesFromAPI} properties (${totalEventsInZip} events) in raw responses`);
          } else {
            console.log(`[INFO] Zip ${zipCode.name}: No properties returned from API`);
          }
        } else {
          console.log(`[WARNING] Zip ${zipCode.name}: No data returned from API`);
        }

      } catch (error: any) {
        console.error(`[ERROR] Failed to process zip ${zipCode.name} (ID: ${zipCode.parcl_id}):`, error.message);
        // Continue with next zip code instead of failing completely
      }

      completedZips++;
      if (completedZips % 25 === 0) {
        console.log(`[PROGRESS] ${completedZips}/${zipCodes.length} zip codes completed`);
        console.log(`[TOTALS] Running totals: ${totalPropertiesProcessed} properties, ${totalEventsProcessed} events`);
      }

      // Rate limiting - small delay between API calls to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Start concurrent workers (each worker processes one zip code at a time)
  const workers = Array.from({ length: concurrency }, () => processZipCode());
  await Promise.all(workers);

  console.log(`\n[COMPLETE] Processing complete!`);
  console.log(`[FINAL] Total: ${totalPropertiesProcessed} properties, ${totalEventsProcessed} events across ${zipCodes.length} zip codes`);
  return { totalProperties: totalPropertiesProcessed, totalEvents: totalEventsProcessed };
}

// Classify property as FLIP, WHOLESALER, or LANDLORD based on event patterns
function classifyPropertyInvestorType(propertyData: PropertyEventData): {
  investorCategory: string;
  daysToSale?: number;
  daysToRental?: number;
} {
  // For backward compatibility, return the current/latest transaction classification
  const transactions = analyzePropertyTransactions(propertyData);
  const latestTransaction = transactions[transactions.length - 1];

  if (!latestTransaction) {
    return { investorCategory: 'UNKNOWN' };
  }

  // Map transaction categories to legacy categories for backward compatibility
  let legacyCategory = 'UNKNOWN';
  if (latestTransaction.transaction_category === 'WHOLESALER') {
    legacyCategory = 'WHOLESALER';
  } else if (latestTransaction.transaction_category === 'FLIP') {
    legacyCategory = 'FLIP';
  } else if (latestTransaction.transaction_category === 'CURRENT_OWNERSHIP' && latestTransaction.has_rental_activity) {
    legacyCategory = 'LANDLORD';
  }

  return {
    investorCategory: legacyCategory,
    daysToSale: latestTransaction.holding_period_days,
    daysToRental: latestTransaction.days_to_first_rental
  };
}

// Analyze all transactions/ownership periods for a property
function analyzePropertyTransactions(propertyData: PropertyEventData): import('../repositories/parclLabsRepository').PropertyTransaction[] {
  if (!propertyData.events || propertyData.events.length === 0) {
    return [];
  }

  // Sort events by date (make a copy to avoid modifying the original object)
  const events = [...propertyData.events].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Find all SOLD events to identify ownership changes
  const soldEvents = events.filter(e => e.event_name === 'SOLD');

  if (soldEvents.length < 1) {
    return [];
  }

  const transactions: import('../repositories/parclLabsRepository').PropertyTransaction[] = [];

  // Analyze each ownership period
  for (let i = 0; i < soldEvents.length; i++) {
    const purchase = soldEvents[i];
    const sale = soldEvents[i + 1]; // Next sale (if exists)

    const transaction: import('../repositories/parclLabsRepository').PropertyTransaction = {
      parcl_property_id: propertyData.parcl_property_id,
      transaction_sequence: i + 1,
      purchase_date: purchase.event_date,
      purchase_price: purchase.price,
      transaction_category: 'UNKNOWN',
      investor_type: 'UNKNOWN',
      has_rental_activity: false,
      rental_events_count: 0
    };

    if (sale) {
      // Completed transaction (property was bought and sold)
      transaction.sale_date = sale.event_date;
      transaction.sale_price = sale.price;
      transaction.holding_period_days = Math.floor((new Date(sale.event_date).getTime() - new Date(purchase.event_date).getTime()) / (1000 * 60 * 60 * 24));

      if (transaction.sale_price && transaction.purchase_price) {
        transaction.profit_loss = transaction.sale_price - transaction.purchase_price;
      }

      // Classify the transaction based on holding period
      if (transaction.holding_period_days <= 14) {
        transaction.transaction_category = 'WHOLESALER';
        transaction.investor_type = 'WHOLESALER';
      } else if (transaction.holding_period_days <= 450) {
        transaction.transaction_category = 'FLIP';
        transaction.investor_type = 'FLIPPER';
      } else {
        transaction.transaction_category = 'LONG_TERM_HOLD';
        transaction.investor_type = 'UNKNOWN';
      }
    } else {
      // Current ownership (property still owned)
      transaction.transaction_category = 'CURRENT_OWNERSHIP';
      transaction.holding_period_days = undefined; // Still owned
    }

    // Analyze rental activity during this ownership period
    const ownershipStart = new Date(purchase.event_date);
    const ownershipEnd = sale ? new Date(sale.event_date) : new Date(); // Current date if still owned

    // Include rental events within ownership period OR within 60 days before sale/purchase
    const rentalEventsDuringOwnership = events.filter(e => {
      if (e.event_name !== 'LISTED_RENT' && e.event_name !== 'PRICE_CHANGE') return false;
      const eventDate = new Date(e.event_date);

      // Standard ownership period check
      const withinOwnership = eventDate >= ownershipStart && eventDate <= ownershipEnd;

      // Additional check: within 60 days before sale (for completed transactions)
      let withinPreSaleWindow = false;
      if (sale) {
        const saleDate = new Date(sale.event_date);
        const sixtyDaysBeforeSale = new Date(saleDate);
        sixtyDaysBeforeSale.setDate(sixtyDaysBeforeSale.getDate() - 60);
        withinPreSaleWindow = eventDate >= sixtyDaysBeforeSale && eventDate <= saleDate;
      }

      // Additional check: within 60 days before purchase (for current ownership)
      // This captures rental activity from previous owner that was still active at purchase
      let withinPrePurchaseWindow = false;
      if (!sale) { // Current ownership - check before purchase
        const sixtyDaysBeforePurchase = new Date(ownershipStart);
        sixtyDaysBeforePurchase.setDate(sixtyDaysBeforePurchase.getDate() - 60);
        withinPrePurchaseWindow = eventDate >= sixtyDaysBeforePurchase && eventDate <= ownershipStart;
      }

      return withinOwnership || withinPreSaleWindow || withinPrePurchaseWindow;
    });

    transaction.has_rental_activity = rentalEventsDuringOwnership.length > 0;
    transaction.rental_events_count = rentalEventsDuringOwnership.length;

    if (transaction.has_rental_activity) {
      // Calculate days to first rental (use earliest rental event within our expanded window)
      const firstRental = rentalEventsDuringOwnership.sort((a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      )[0];
      transaction.days_to_first_rental = Math.floor((new Date(firstRental.event_date).getTime() - ownershipStart.getTime()) / (1000 * 60 * 60 * 24));

      // Extract the latest rental price during this ownership period (only from ownership period events)
      // For rental prices, we only want events that actually occurred during ownership
      const ownershipRentalEvents = rentalEventsDuringOwnership.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate >= ownershipStart && eventDate <= ownershipEnd;
      });

      if (ownershipRentalEvents.length > 0) {
        const rentalPrices = ownershipRentalEvents
          .filter(e => e.price && e.price > 0)
          .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()); // Latest first

        if (rentalPrices.length > 0) {
          transaction.rental_price = rentalPrices[0].price;
        }
      }

      // Classify as landlord if:
      // 1. Current ownership with rental activity (during ownership OR within 60 days before purchase), OR
      // 2. Completed transaction with rental activity within ownership period OR within 60 days before sale
      if (transaction.transaction_category === 'CURRENT_OWNERSHIP') {
        transaction.investor_type = 'LANDLORD';
      } else if (sale && transaction.has_rental_activity) {
        // For completed transactions, check if rental activity was during ownership OR pre-sale window
        const hasPreSaleRentalActivity = rentalEventsDuringOwnership.some(e => {
          const eventDate = new Date(e.event_date);
          const saleDate = new Date(sale.event_date);
          const sixtyDaysBeforeSale = new Date(saleDate);
          sixtyDaysBeforeSale.setDate(sixtyDaysBeforeSale.getDate() - 60);
          return eventDate >= sixtyDaysBeforeSale && eventDate < ownershipStart; // Pre-sale but after previous ownership
        });

        if (hasPreSaleRentalActivity) {
          transaction.investor_type = 'LANDLORD';
        }
      }
    }

    transactions.push(transaction);
  }

  return transactions;
}

// Save ALL zip code data to database (complete audit trail)
async function saveAllZipCodeDataToDatabase(
  allProperties: PropertyEventData[],
  parclLabsRepository: any,
  searchSessionId: string,
  zipCodeParclId: number
): Promise<void> {
  const startTime = Date.now();
  console.log(`[RAW STORAGE] Storing ${allProperties.length} properties from zip code ${zipCodeParclId}...`);

  if (allProperties.length === 0) {
    console.log(`[SUCCESS] No properties to store for zip code ${zipCodeParclId}`);
    return;
  }

  try {
    // Prepare raw response data for ALL properties (batch insert)
    const rawResponseData: any[] = allProperties.map(propertyData => ({
      request_hash: crypto.createHash('sha256').update(JSON.stringify(propertyData)).digest('hex'),
      api_endpoint: '/v2/property_search',
      request_params: { parcl_ids: [zipCodeParclId] },
      raw_response: propertyData,
      response_status: 200,
      search_session_id: searchSessionId,
      target_property_id: propertyData.parcl_property_id
    }));

    // Batch save ALL raw responses (no filtering at storage level)
    const hashToIdMap = await parclLabsRepository.batchSaveRawResponses(rawResponseData);
    console.log(`[RAW STORAGE] Saved ${rawResponseData.length} raw responses in ${(Date.now() - startTime) / 1000}s`);

    // Now apply filtering for transaction processing
    const propertiesWithEvents = allProperties.filter((property: any) =>
      property.events && Array.isArray(property.events) &&
      property.events.some((event: any) =>
        ['SOLD', 'LISTED_RENT', 'PRICE_CHANGE'].includes(event.event_name)
      ) &&
      (!property.property_metadata?.year_built || property.property_metadata.year_built < 2023 || property.property_metadata.year_built != null)
    );

    console.log(`[FILTER] After filtering ${allProperties.length} properties: ${propertiesWithEvents.length} qualify for transaction processing`);

    // Process filtered properties for transactions
    if (propertiesWithEvents.length > 0) {
      // Prepare property data for batch insert
      const propertyData: any[] = [];
      const allEvents: any[] = [];

      propertiesWithEvents.forEach(propertyDataItem => {
        const classification = classifyPropertyInvestorType(propertyDataItem);
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(propertyDataItem)).digest('hex');
        const rawResponseId = hashToIdMap.get(requestHash);

        if (rawResponseId) {
          // Add property data
          propertyData.push({
            parcl_property_id: propertyDataItem.parcl_property_id,
            raw_response_id: rawResponseId,
            search_session_id: searchSessionId,
            address: propertyDataItem.property_metadata?.address1 || '',
            city: propertyDataItem.property_metadata?.city || '',
            state_abbreviation: propertyDataItem.property_metadata?.state || '',
            county: propertyDataItem.property_metadata?.county_name || '',
            zip_code: propertyDataItem.property_metadata?.zip5 || '',
            bedrooms: propertyDataItem.property_metadata?.bedrooms || 0,
            bathrooms: parseFloat(propertyDataItem.property_metadata?.bathrooms) || 0,
            square_footage: propertyDataItem.property_metadata?.sq_ft || 0,
            year_built: propertyDataItem.property_metadata?.year_built || 0,
            property_type: propertyDataItem.property_metadata?.property_type || '',
            latitude: parseFloat(propertyDataItem.property_metadata?.latitude) || 0,
            longitude: parseFloat(propertyDataItem.property_metadata?.longitude) || 0,
            unit: propertyDataItem.property_metadata?.address2 || '',
            cbsa: propertyDataItem.property_metadata?.cbsa || '',
            event_count: propertyDataItem.events?.length || 0,
            current_on_market_flag: propertyDataItem.property_metadata?.current_on_market_flag === 1,
            event_history_sale_flag: propertyDataItem.property_metadata?.event_history_sale_flag === 1,
            event_history_rental_flag: propertyDataItem.property_metadata?.event_history_rental_flag === 1,
            event_history_listing_flag: propertyDataItem.property_metadata?.event_history_listing_flag === 1,
            current_investor_owned_flag: propertyDataItem.property_metadata?.current_investor_owned_flag === 1,
            current_owner_occupied_flag: propertyDataItem.property_metadata?.current_owner_occupied_flag === 1,
            current_new_construction_flag: propertyDataItem.property_metadata?.current_new_construction_flag === 1,
            current_on_market_rental_flag: propertyDataItem.property_metadata?.current_on_market_rental_flag === 1,
            // Investor classification
            investor_category: classification.investorCategory,
            days_to_sale: classification.daysToSale,
            days_to_rental: classification.daysToRental,
            classification_date: new Date().toISOString()
          });

          // Add events data
          if (propertyDataItem.events && Array.isArray(propertyDataItem.events)) {
            propertyDataItem.events.forEach(event => {
              allEvents.push({
                parcl_property_id: propertyDataItem.parcl_property_id,
                raw_response_id: rawResponseId,
                search_session_id: searchSessionId,
                event_type: event.event_type || '',
                event_name: event.event_name || '',
                event_date: event.event_date || '',
                price: event.price ? parseFloat(event.price) : null,
                entity_owner_name: event.entity_owner_name || '',
                true_sale_index: event.true_sale_index === 1,
                investor_flag: event.investor_flag === 1,
                owner_occupied_flag: event.owner_occupied_flag === 1,
                transfer_index: event.transfer_index || null,
                current_owner_flag: event.current_owner_flag === 1,
                new_construction_flag: event.new_construction_flag === 1,
                record_updated_date: event.record_updated_date || null
              });
            });
          }
        }
      });

      // Batch save properties
      if (propertyData.length > 0) {
        await parclLabsRepository.batchSaveProperties(propertyData);
        console.log(`[FILTERED] Saved ${propertyData.length} filtered properties in ${(Date.now() - startTime) / 1000}s`);
      }

      // Batch save events
      if (allEvents.length > 0) {
        await parclLabsRepository.batchSavePropertyEvents(allEvents);
        console.log(`[FILTERED] Saved ${allEvents.length} events in ${(Date.now() - startTime) / 1000}s`);
      }

      // Analyze and save transaction-level classifications
      const allTransactions: import('../repositories/parclLabsRepository').PropertyTransaction[] = [];
      let propertiesWithSoldEvents = 0;

      propertiesWithEvents.forEach(propertyDataItem => {
        const transactions = analyzePropertyTransactions(propertyDataItem);
        if (transactions.length > 0) {
          propertiesWithSoldEvents++;
          allTransactions.push(...transactions);
        }
      });

      console.log(`[TRANSACTIONS] ${propertiesWithSoldEvents}/${propertiesWithEvents.length} filtered properties have SOLD events and transaction data`);

      if (allTransactions.length > 0) {
        await parclLabsRepository.batchSavePropertyTransactions(allTransactions);
        console.log(`[TRANSACTIONS] Saved ${allTransactions.length} transaction classifications in ${(Date.now() - startTime) / 1000}s`);
      } else {
        console.log(`[WARNING] No transaction data to save for zip code ${zipCodeParclId}`);
      }

      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`[SUCCESS] Complete processing: ${allProperties.length} stored, ${propertiesWithEvents.length} filtered, ${allTransactions.length} transactions from zip code ${zipCodeParclId} in ${totalTime.toFixed(2)}s`);
    }

  } catch (error: any) {
    console.error(`[ERROR] Failed to save data for zip code ${zipCodeParclId}:`, error.message);
    throw error;
  }
}



// Generate summary report
async function generateSummaryReport(
  zipCodes: TNZipCode[],
  processingResult: { totalProperties: number; totalEvents: number },
  dateRange: { minDate: string; maxDate: string },
  concurrency: number
): Promise<string> {
  const reportsDir = await ensureReportsDir();
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const reportPath = path.join(reportsDir, `tn_property_events_summary_${timestamp}.txt`);

  const totalZipCodes = zipCodes.length;
  const totalProperties = processingResult.totalProperties;
  const totalEvents = processingResult.totalEvents;

  // Note: Since we save data incrementally, we can't easily get breakdown by event type
  // from the processing result. For detailed event breakdown, query the database directly.
  const soldEvents = 'N/A (query database for detailed breakdown)';
  const rentalEvents = 'N/A (query database for detailed breakdown)';

  const reportContent = `
TN Property Events Data Collection Report
=========================================

Execution Time: ${new Date().toISOString()}
Search Period: ${dateRange.minDate} to ${dateRange.maxDate} (Dynamic: 2 years from today)

PROCESSING APPROACH:
-------------------
- Incremental Database Saves: Data saved immediately after each zip code is processed
- One Zip Code Per API Call: Precise targeting with individual API calls
- Concurrent Processing: ${concurrency} parallel workers
- Property Type Filtering: SINGLE_FAMILY, OTHER only
- Memory Efficient: No large data structures held in memory

SUMMARY:
--------
Total TN Zip Codes Processed: ${totalZipCodes}
Total Properties with Events: ${totalProperties}
Total Events Found: ${totalEvents}

Property Classifications:
- WHOLESALER Properties: Query database for count (properties sold within 14 days - quick assignments)
- FLIP Properties: Query database for count (properties sold 15 days to 15 months - traditional flips)
- LANDLORD Properties: Query database for count (properties with rental events AFTER purchase within 7 months)
- UNKNOWN Properties: Query database for count (insufficient data for classification)

Event Breakdown:
- SOLD Events: ${soldEvents}
- Landlord Events (LISTED_RENT + PRICE_CHANGE): ${rentalEvents}

Average Events per Property: ${totalProperties > 0 ? (totalEvents / totalProperties).toFixed(2) : 0}
Average Properties per Zip Code: ${totalZipCodes > 0 ? (totalProperties / totalZipCodes).toFixed(2) : 0}

ZIP CODES PROCESSED:
-------------------
${zipCodes.map(zip => `${zip.name} (Parcl ID: ${zip.parcl_id}, Population: ${zip.total_population})`).join('\n')}
`;

  await fs.writeFile(reportPath, reportContent);
  console.log(`Summary report saved to: ${reportPath}`);
  return reportPath;
}

async function main() {
  const startTime = Date.now();

  try {
    // Setup database environment
    setDbEnvFromDatabaseUrl();

    // Import dependencies
    const parclLabsRepository = await import('../repositories/parclLabsRepository');
    const parclLabsClient = (await import('../utils/api/parclLabsClient')).default;
    const { closeDatabasePool } = await import('../config/db');

    // Setup logging
    const logsDir = await ensureLogsDir();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const logPath = path.join(logsDir, `tn_property_events_${timestamp}.log`);
    const logStream = createWriteStream(logPath, { encoding: 'utf8' });

    const originalConsoleLog = console.log.bind(console);
    const originalConsoleError = console.error.bind(console);

    function serializeArgs(args: any[]): string {
      return args
        .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
        .join(' ');
    }

    console.log = (...args: any[]) => {
      const line = `[INFO] ${new Date().toISOString()} ${serializeArgs(args)}\n`;
      logStream.write(line);
      originalConsoleLog(...args);
    };

    console.error = (...args: any[]) => {
      const line = `[ERROR] ${new Date().toISOString()} ${serializeArgs(args)}\n`;
      logStream.write(line);
      originalConsoleError(...args);
    };

    console.log('Starting TN Property Events Data Collection Script');
    console.log('================================================');

    // Calculate dynamic date range (today to 2 years ago)
    const dateRange = getDynamicDateRange();

    // Read concurrency setting from environment variable (similar to existing scripts)
    const concurrency = Math.max(1, parseInt(process.env.TN_EVENTS_CONCURRENCY || '1', 10));
    console.log(`Using concurrency: ${concurrency}`);

    // Step 1: Fetch TN zip codes
    const zipCodes = await fetchTNZipCodes(parclLabsClient);

    // Step 2: Search for property events
    const processingResult = await searchPropertyEventsByZipCodes(parclLabsClient, parclLabsRepository.default, zipCodes, 1, concurrency, dateRange);

    // Step 3: Generate summary report (data already saved incrementally)
    const reportPath = await generateSummaryReport(zipCodes, processingResult, dateRange, concurrency);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\nScript completed successfully in ${duration} minutes`);
    console.log(`Summary report: ${reportPath}`);

    // Cleanup
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    logStream.end();
    await once(logStream, 'finish');
    await closeDatabasePool();

  } catch (error: any) {
    console.error('Script failed:', error.message);
    process.exitCode = 1;
  }
}

// Execute if run directly
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
