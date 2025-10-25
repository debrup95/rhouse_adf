import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { once } from 'events';
import path from 'path';

interface ReportRow {
  investor: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  lastSaleDate: string;
  lastSaleAmount: number | null;
  arvComp: number | null;
  rentComp: number | null;
  rentDate: string;
  expenseRatioPct: number | null; // as percent value, e.g., 35
  noi: number | null;
  capRatePct: number | null; // as percent value
  arvPct: number | null; // LastSaleAmount / ARV * 100
  confidence: string; // High or Low
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

function percentile20Descending(prices: number[]): number | null {
  if (!prices || prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => b - a);
  const idx = Math.floor(sorted.length * 0.2);
  const safeIdx = Math.min(Math.max(idx, 0), sorted.length - 1);
  return sorted[safeIdx] ?? null;
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
  const propertyService = (await import('../services/property/propertyService')).default;
  const marketService = (await import('../services/property/marketService')).default;
  const { closeDatabasePool } = await import('../config/db');

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
  const outPath = path.join(dir, `buyer_purchases_${timestamp}.csv`);
  // Prepare log stream and tee console output
  const logsDir = await ensureLogsDir();
  const logPath = path.join(logsDir, `buyer_purchases_${timestamp}.log`);
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

  const headers = [
    'Investor',
    'Address',
    'City',
    'State',
    'Zip',
    'County',
    'Last Sale Date',
    'Last Sale Amount',
    'ARV (comp)',
    'Rent (Comp)',
    'Rent Date',
    'Expense Ratio',
    'NOI',
    'Cap Rate',
    'ARV %',
    'Confidence',
  ];
  stream.write(headers.map(formatCsvValue).join(',') + '\n');

  // Simple caches
  const marketCache = new Map<string, { operating_expense: number }>();
  const concurrency = Math.max(1, parseInt(process.env.REPORT_CONCURRENCY || '5', 10));
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
      toCurrencyNoSymbol(row.arvComp),
      toCurrencyNoSymbol(row.rentComp),
      row.rentDate,
      toPercent(row.expenseRatioPct),
      toCurrencyNoSymbol(row.noi),
      toPercent(row.capRatePct, 2),
      toPercent(row.arvPct, 0),
      row.confidence,
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
      const propertyAnalysis = await propertyService.getPropertyAndMarketData({ address: { formattedAddress } });
      const target = propertyAnalysis?.targetProperty || {};
      const comps: any[] = Array.isArray(propertyAnalysis?.comparableProperties) ? propertyAnalysis.comparableProperties : [];

      const soldComps = comps.filter(
        (c) => c && !c.isOutlier && c.eventDetails && (c.eventDetails.event_name === 'SOLD' || c.eventDetails.event_type === 'SALE') && typeof c.price === 'number'
      );
      const rentalComps = comps.filter((c) => {
        if (!c || c.isOutlier || typeof c.price !== 'number') return false;
        const statusOk = c.status === 'LISTED_RENT';
        const ed = c.eventDetails || {};
        const eventTypeOk = ed.event_type === 'RENTAL';
        const eventNameOk = ed.event_name === 'LISTED_RENT' || ed.event_name === 'PRICE_CHANGE';
        return statusOk || eventTypeOk || eventNameOk;
      });

      const arvComp = percentile20Descending(soldComps.map((c) => Number(c.price)));
      const rentComp = percentile20Descending(rentalComps.map((c) => Number(c.price)));
      const rentReference = rentalComps
        .sort((a, b) => Number(b.price) - Number(a.price))
        .map((c) => c.eventDetails?.event_date)
        [Math.floor(rentalComps.length * 0.2)] || null;
      const rentDate = formatDate(rentReference);
      const confidence = (soldComps.length < 10 || rentalComps.length < 10) ? 'Low' : 'High';

      const stateForMarket: string = target.state_abbreviation || state || '';
      const countyForMarket: string = target.county || countyFromHistory || '';
      let expenseRatioPct: number | null = null;
      if (stateForMarket && countyForMarket) {
        const key = `${stateForMarket}|${countyForMarket}`;
        const cached = marketCache.get(key);
        if (cached) {
          expenseRatioPct = cached.operating_expense;
        } else {
          const market = await marketService.getMarketUnderwriteInputs(stateForMarket, countyForMarket);
          expenseRatioPct = market?.operating_expense ?? null;
          if (expenseRatioPct !== null) marketCache.set(key, { operating_expense: expenseRatioPct });
        }
      }

      const noi = rentComp !== null && expenseRatioPct !== null ? rentComp * 12 * (1 - expenseRatioPct / 100) : null;
      const capRatePct = noi !== null && arvComp && arvComp > 0 ? (noi / arvComp) * 100 : null;
      const arvPct = lastSaleAmount !== null && arvComp && arvComp > 0 ? (lastSaleAmount / arvComp) * 100 : null;

      await writeRow({
        investor: investorName,
        address: addressLine,
        city,
        state,
        zip,
        county: target.county || countyFromHistory || '',
        lastSaleDate,
        lastSaleAmount,
        arvComp,
        rentComp,
        rentDate,
        expenseRatioPct,
        noi,
        capRatePct,
        arvPct,
        confidence,
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
    'ARV (comp)',
    'Rent (Comp)',
    'Rent Date',
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
      toCurrencyNoSymbol(r.arvComp),
      toCurrencyNoSymbol(r.rentComp),
      r.rentDate,
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
