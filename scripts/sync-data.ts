import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const INSTRUMENTS: Record<string, { symbol: string; name: string }> = {
  sp500: { symbol: '^GSPC', name: 'S&P 500' },
  nasdaq100: { symbol: '^NDX', name: 'NASDAQ-100' }
};

const yf = new YahooFinance();

async function syncSymbol(symbol: string, name: string, fromDate: string = '2015-01-01'): Promise<Candle[]> {
  console.log(`▶ [${name}] Syncing ${symbol} from Yahoo Finance (Since ${fromDate})...`);

  const chartResult: any = await yf.chart(symbol, {
    period1: fromDate,
    interval: '1d'
  });

  const quotes = chartResult?.quotes || [];
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error(`No quotes returned for ${symbol}`);
  }

  const cleanedCandles: Candle[] = [];
  const seenDates = new Set<string>();

  for (const q of quotes) {
    if (!q.date) continue;
    const dateStr = typeof q.date === 'string'
      ? q.date.split('T')[0]
      : (q.date as Date).toISOString().split('T')[0];

    if (seenDates.has(dateStr)) continue;

    const open = q.open ?? q.adjclose ?? q.close;
    const high = q.high ?? Math.max(open, q.close);
    const low = q.low ?? Math.min(open, q.close);
    const close = q.close ?? open;
    const volume = q.volume ?? 0;

    if (open != null && high != null && low != null && close != null && !isNaN(open)) {
      seenDates.add(dateStr);
      cleanedCandles.push({
        date: dateStr,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(volume)
      });
    }
  }

  cleanedCandles.sort((a, b) => a.date.localeCompare(b.date));
  return cleanedCandles;
}

async function main() {
  console.log('===========================================================');
  console.log('  📈 Stock Chart Trainer - Market Data Synchronization   ');
  console.log('===========================================================\n');

  const targetDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const seedFilePath = path.join(targetDir, 'seedCandles.json');
  let existingData: Record<string, Candle[]> = {};

  if (fs.existsSync(seedFilePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));
    } catch {
      existingData = {};
    }
  }

  const resultData: Record<string, Candle[]> = { ...existingData };

  for (const [key, info] of Object.entries(INSTRUMENTS)) {
    try {
      const candles = await syncSymbol(info.symbol, info.name);
      resultData[info.symbol] = candles;
      const minDate = candles[0]?.date;
      const maxDate = candles[candles.length - 1]?.date;
      console.log(`  ✔ Successfully synced ${candles.length} candles for ${info.name} (${minDate} ~ ${maxDate})\n`);
    } catch (err: any) {
      console.warn(`  ⚠️ Live sync failed for ${info.name} (${info.symbol}): ${err.message}`);
      if (existingData[info.symbol]?.length > 0) {
        console.log(`  ℹ Retaining existing cached ${existingData[info.symbol].length} candles.\n`);
      } else {
        console.error(`  ❌ No fallback data available for ${info.symbol}.\n`);
      }
    }
  }

  fs.writeFileSync(seedFilePath, JSON.stringify(resultData, null, 2), 'utf-8');
  const stats = fs.statSync(seedFilePath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log('-----------------------------------------------------------');
  console.log(`✔ [Data Export] Successfully saved to ${seedFilePath}`);
  console.log(`📦 File Size: ${sizeKb} KB`);
  console.log('✨ Data synchronization complete! Ready for build and deployment.\n');
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
