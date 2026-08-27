import fs from 'fs';
import path from 'path';
import { initDb, saveCandles, getCandlesFromDb, getCandleStats } from './db';
import { YahooMarketDataProvider, INSTRUMENTS } from './MarketDataProvider';

async function runPrecache() {
  console.log('====================================================');
  console.log('  📈 Stock Chart Trainer - Market Data Pre-Caching  ');
  console.log('====================================================\n');

  await initDb();
  console.log('[DB] SQLite database initialized.\n');

  const provider = new YahooMarketDataProvider();
  const seedData: Record<string, any[]> = {};

  for (const [key, info] of Object.entries(INSTRUMENTS)) {
    console.log(`▶ [${key.toUpperCase()}] Syncing ${info.name} (${info.symbol})...`);
    try {
      const count = await provider.syncSymbol(info.symbol, '2015-01-01');
      console.log(`  ✔ Synced ${count} candles for ${info.symbol}.`);
    } catch (err: any) {
      console.warn(`  ⚠️ Live sync failed for ${info.symbol}: ${err.message}`);
    }

    const candles = await getCandlesFromDb(info.symbol);
    const stats = await getCandleStats(info.symbol);
    seedData[info.symbol] = candles;

    console.log(`  📊 Stored in DB: ${stats.count} candles (${stats.minDate} ~ ${stats.maxDate})\n`);
  }

  // Export to bundled seed JSON
  const dataDir = path.resolve(__dirname, './data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const seedFilePath = path.join(dataDir, 'seedCandles.json');
  fs.writeFileSync(seedFilePath, JSON.stringify(seedData, null, 2), 'utf-8');
  console.log(`✔ [Seed Export] Successfully exported snapshot to ${seedFilePath}`);
  console.log('\n✨ Pre-caching complete! Offline and cloud deployment ready.\n');
}

runPrecache().catch((err) => {
  console.error('Fatal pre-caching error:', err);
  process.exit(1);
});
