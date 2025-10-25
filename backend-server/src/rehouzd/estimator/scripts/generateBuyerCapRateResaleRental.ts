import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { once } from 'events';
import path from 'path';
import crypto from 'crypto';

interface ReportRow {
  investor: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  lastSaleDate: string;
  lastSaleAmount: number | null;
  resaleDate: string;
  resalePrice: number | null;
  latestRentalPrice: number | null;
  rentalDate: string;
  expenseRatioPct: number; // Fixed at 35%
  noi: number | null;
  capRatePct: number | null; // as percent value
  arvPct: number | null; // LastSaleAmount / ARV * 100
}

// New interface for property events from Parcl Labs
interface PropertyEvent {
  event_type: string;
  event_name: string;
  event_date: string;
  price: number | null;
  entity_owner_name?: string;
}

function formatDate(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US');
}

function formatCsvValue(value: string | number | null): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Escape quotes by doubling them and wrap in quotes
  return '"' + str.replace(/"/g, '""') + '"';
}

function toCurrencyNoSymbol(value: number | null): string {
  if (value === null || value === undefined || !isFinite(value)) return '';
  return Math.round(value).toLocaleString('en-US');
}

function toPercent(value: number | null, fractionDigits = 0): string {
  if (value === null || value === undefined || !isFinite(value)) return '';
  return `${value.toFixed(fractionDigits)}%`;
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

// Local interfaces to avoid importing DB models at top-level
interface PurchaseHistoryItem {
  prop_last_sale_dt: string;
  prop_last_sale_amt: number;
  prop_address_line_txt: string;
  prop_city_nm: string;
  prop_state_nm: string;
  prop_zip_cd: string;
  prop_county_nm?: string;
  prop_attr_br_cnt?: number;
  prop_attr_bth_cnt?: number;
  prop_attr_sqft_nr?: number;
  prop_yr_blt_nr?: number;
}

interface Buyer {
  id: number;
  investor_company_nm_txt: string;
  investor_profile: any;
  num_prop_purchased_lst_12_mths_nr: number;
  active_flg: boolean;
  purchase_history?: PurchaseHistoryItem[];
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



async function generateReportToCsv(): Promise<string> {
  // Map DATABASE_URL to individual DB_* vars before importing modules that init pools
  setDbEnvFromDatabaseUrl();
  const { buyerModel } = await import('../models/buyer/buyerModel');
  const parclLabsClient = (await import('../utils/api/parclLabsClient')).default;
  const { closeDatabasePool, query } = await import('../config/db');



  const allBuyers: Buyer[] = await buyerModel.getAllActiveBuyersWithHistory();
  const buyers: Buyer[] = [...allBuyers]
    .sort((a, b) => (b.num_prop_purchased_lst_12_mths_nr || 0) - (a.num_prop_purchased_lst_12_mths_nr || 0));
    // .slice(0, 5);

  // Debug logs
  // eslint-disable-next-line no-console
  console.log(`Found ${allBuyers.length} active buyers; processing top ${buyers.length}`);

  // Build task list
  type Task = { buyer: Buyer; item: PurchaseHistoryItem };
  const tasks: Task[] = [];
  for (const buyer of buyers) {
    // eslint-disable-next-line no-console
    console.log(`Processing buyer: ${buyer.investor_company_nm_txt} (purchases last 12m: ${buyer.num_prop_purchased_lst_12_mths_nr})`);
    const history: PurchaseHistoryItem[] = Array.isArray(buyer.purchase_history) ? buyer.purchase_history : [];
    for (const item of history) tasks.push({ buyer, item });
  }

  // Prepare CSV stream
  const dir = await ensureReportsDir();
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const outPath = path.join(dir, `buyer_caprate_resale_rental_${timestamp}.csv`);
  // Prepare log stream and tee console output
  const logsDir = await ensureLogsDir();
  const logPath = path.join(logsDir, `buyer_caprate_resale_rental_${timestamp}.log`);
  const logStream = createWriteStream(logPath, { encoding: 'utf8' });
  const originalConsoleLog = console.log.bind(console);
  const originalConsoleError = console.error.bind(console);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function serializeArgs(args: any[]): string {
    return args
      .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
      .join(' ');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log = (...args: any[]) => {
    const line = `[INFO] ${new Date().toISOString()} ${serializeArgs(args)}\n`;
    logStream.write(line);
    originalConsoleLog(...args);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    const line = `[ERROR] ${new Date().toISOString()} ${serializeArgs(args)}\n`;
    logStream.write(line);
    originalConsoleError(...args);
  };

  const stream = createWriteStream(outPath, { encoding: 'utf8' });

  // Function to save Parcl Labs responses to cache
  async function saveParclLabsResponseToCache(
    searchAddress: string, 
    addressResponse: any, 
    eventsResponse: any
  ): Promise<void> {
    try {
      // Create hash of the search address for unique identification
      const addressHash = crypto.createHash('sha256').update(searchAddress.toLowerCase().trim()).digest('hex');
      
      // Upsert the cache entry
      const upsertQuery = `
        INSERT INTO parcl_labs_cache (address_hash, search_address, address_response, events_response)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (address_hash) 
        DO UPDATE SET 
          address_response = EXCLUDED.address_response,
          events_response = EXCLUDED.events_response,
          updated_at = NOW()
      `;
      
      await query(upsertQuery, [
        addressHash,
        searchAddress,
        JSON.stringify(addressResponse),
        JSON.stringify(eventsResponse)
      ]);
      
      console.log(`Cached Parcl Labs response for address: ${searchAddress}`);
    } catch (error) {
      console.error('Failed to save Parcl Labs response to cache:', error);
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  const headers = [
    'Investor',
    'Address',
    'City',
    'State',
    'Zip',
    'County',
    'Last Sale Date',
    'Last Sale Amount',
    'Resale Date',
    'Resale Price',
    'Latest Rental Price',
    'Rental Date',
    'Expense Ratio',
    'NOI',
    'Cap Rate',
    'ARV %',
  ];
  stream.write(headers.map(formatCsvValue).join(',') + '\n');

  // Simple caches
  let concurrency = Math.max(1, parseInt(process.env.REPORT_CONCURRENCY || '1', 10));

  // eslint-disable-next-line no-console
  console.log(`Total tasks: ${tasks.length}; running with concurrency=${concurrency}`);

  let completed = 0;
  async function writeRow(row: ReportRow): Promise<void> {
    const line = [
      row.investor,
      row.address,
      row.city,
      row.state,
      row.zip,
      row.county,
      row.lastSaleDate,
      toCurrencyNoSymbol(row.lastSaleAmount),
      row.resaleDate,
      toCurrencyNoSymbol(row.resalePrice),
      toCurrencyNoSymbol(row.latestRentalPrice),
      row.rentalDate,
      toPercent(row.expenseRatioPct),
      toCurrencyNoSymbol(row.noi),
      toPercent(row.capRatePct, 2),
      toPercent(row.arvPct, 0),
    ].map(formatCsvValue).join(',') + '\n';
    if (!stream.write(line)) {
      await once(stream, 'drain');
    }
  }

  async function worker(task: Task): Promise<void> {
    const { buyer, item } = task;
    const investorName = buyer.investor_company_nm_txt || '';
    const addressLine = item.prop_address_line_txt || '';
    const city = item.prop_city_nm || '';
    const state = item.prop_state_nm || '';
    const zip = item.prop_zip_cd || '';
    const countyFromHistory = item.prop_county_nm || '';
    const lastSaleDate = formatDate(item.prop_last_sale_dt);
    const lastSaleAmount = typeof item.prop_last_sale_amt === 'number' ? item.prop_last_sale_amt : null;
    const formattedAddress = `${addressLine}, ${city}, ${state} ${zip}`.trim();

    try {
      // Parse address components
      const addressParts = formattedAddress.split(',').map(part => part.trim());
      const address = addressParts[0] || '';
      const city = addressParts[1] || '';
      const stateZip = addressParts[2] || '';
      const state = stateZip.split(' ')[0] || '';
      const zip = stateZip.split(' ')[1] || '';

      // Get address data first
      const addressDataResponse = await parclLabsClient.searchAddress([{ 
        address, 
        city, 
        state_abbreviation: state, 
        zip_code: zip 
      }]);
      
      if (!addressDataResponse.data.items?.length) {
        throw new Error('Could not retrieve property data');
      }

      const propertyDetails = addressDataResponse.data.items[0];
      const latitude = parseFloat(propertyDetails.latitude) || 0;
      const longitude = parseFloat(propertyDetails.longitude) || 0;
      const parclPropertyId = propertyDetails.parcl_property_id;

      if (!latitude || !longitude) {
        throw new Error('Could not determine property coordinates');
      }

      const propertySearchResponse = await parclLabsClient.searchPropertyEvents([String(parclPropertyId)]);

      // Save both API responses to cache in a single query
      await saveParclLabsResponseToCache(formattedAddress, addressDataResponse.data, propertySearchResponse.data);

    

      // Extract event history data
      let resaleDate = '';
      let resalePrice: number | null = null;
      let latestRentalPrice: number | null = null;
      let rentalDate = '';

      
      const targetPropertyEvents = propertySearchResponse.data.items || [];

      // Get latest sale event for target property
      const targetSaleEvents = targetPropertyEvents
        .filter((event: any) => event.event_type === 'SALE' && event.event_name === 'SOLD' && event.price && event.price > 0)
        .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());


      if (targetSaleEvents.length > 0) {
        const latestSale = targetSaleEvents[0];
        resaleDate = formatDate(latestSale.event_date);
        resalePrice = latestSale.price;
      }

      // Get latest rental event from all properties
      const allRentalEvents = targetPropertyEvents
            .filter((event: any) => event.event_type === 'RENTAL' && (event.event_name === 'LISTED_RENT' || event.event_name === 'PRICE_CHANGE') && 
              event.price && event.price > 0
            )
            .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());


      if (allRentalEvents.length > 0) {
        const latestRental = allRentalEvents[0];
        rentalDate = formatDate(latestRental.event_date);
        latestRentalPrice = latestRental.price;
      }

      // Use fixed 35% expense ratio
      const expenseRatioPct = 35;

      // Calculate NOI and cap rate using latest rental price
      const rentalPriceForCalculation = latestRentalPrice;

      // Use target property's resale price for ARV calculation
      const arvPriceForCalculation = resalePrice;

      const noi = rentalPriceForCalculation !== null ? rentalPriceForCalculation * 12 * (1 - expenseRatioPct / 100) : null;
      const capRatePct = noi !== null && arvPriceForCalculation && arvPriceForCalculation > 0 ? (noi / arvPriceForCalculation) * 100 : null;
      const arvPct = lastSaleAmount !== null && resalePrice && resalePrice > 0 ? (lastSaleAmount / resalePrice) * 100 : null;

      await writeRow({
        investor: investorName,
        address: addressLine,
        city,
        state,
        zip,
        county: propertyDetails.county || countyFromHistory || '',
        lastSaleDate,
        lastSaleAmount,
        resaleDate,
        resalePrice,
        latestRentalPrice,
        rentalDate,
        expenseRatioPct,
        noi,
        capRatePct,
        arvPct,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error processing purchase history item', {
        buyer: buyer.investor_company_nm_txt,
        address: formattedAddress,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      completed += 1;
      if (completed % 50 === 0) {
        // eslint-disable-next-line no-console
        console.log(`Progress: ${completed}/${tasks.length} items processed`);
      }
    }
  }

  // Run with fixed concurrency
  let idx = 0;
  async function runNext(): Promise<void> {
    if (idx >= tasks.length) return;
    const task = tasks[idx++];
    await worker(task);
    return runNext();
  }
  const runners = Array.from({ length: concurrency }, () => runNext());
  await Promise.all(runners);

  try {
    await closeDatabasePool();
  } catch {
    // ignore
  }
  stream.end();
  await once(stream, 'finish');
  // Restore console and close log stream
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  logStream.end();
  await once(logStream, 'finish');
  return outPath;
}

function toCsv(rows: ReportRow[]): string {
  const headers = [
    'Investor',
    'Address',
    'City',
    'State',
    'Zip',
    'County',
    'Last Sale Date',
    'Last Sale Amount',
    'Resale Date',
    'Resale Price',
    'Latest Rental Price',
    'Rental Date',
    'Expense Ratio',
    'NOI',
    'Cap Rate',
    'ARV %',
  ];

  const headerLine = headers.map(formatCsvValue).join(',');

  const lines = rows.map((r) =>
    [
      r.investor,
      r.address,
      r.city,
      r.state,
      r.zip,
      r.county,
      r.lastSaleDate,
      toCurrencyNoSymbol(r.lastSaleAmount),
      r.resaleDate,
      toCurrencyNoSymbol(r.resalePrice),
      toCurrencyNoSymbol(r.latestRentalPrice),
      r.rentalDate,
      toPercent(r.expenseRatioPct),
      toCurrencyNoSymbol(r.noi),
      toPercent(r.capRatePct, 0),
      toPercent(r.arvPct, 0),
    ].map(formatCsvValue).join(',')
  );

  return [headerLine, ...lines].join('\n');
}

async function main() {
  try {
    const outPath = await generateReportToCsv();
    // eslint-disable-next-line no-console
    console.log(`Report written: ${outPath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate report', err);
    process.exitCode = 1;
  } finally {
    // nothing to cleanup here (pool closed above)
  }
}

// Execute if run directly
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
