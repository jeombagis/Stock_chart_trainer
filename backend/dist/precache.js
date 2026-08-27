"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const MarketDataProvider_1 = require("./MarketDataProvider");
async function runPrecache() {
    console.log('====================================================');
    console.log('  📈 Stock Chart Trainer - Market Data Pre-Caching  ');
    console.log('====================================================\n');
    await (0, db_1.initDb)();
    console.log('[DB] SQLite database initialized.\n');
    const provider = new MarketDataProvider_1.YahooMarketDataProvider();
    const seedData = {};
    for (const [key, info] of Object.entries(MarketDataProvider_1.INSTRUMENTS)) {
        console.log(`▶ [${key.toUpperCase()}] Syncing ${info.name} (${info.symbol})...`);
        try {
            const count = await provider.syncSymbol(info.symbol, '2015-01-01');
            console.log(`  ✔ Synced ${count} candles for ${info.symbol}.`);
        }
        catch (err) {
            console.warn(`  ⚠️ Live sync failed for ${info.symbol}: ${err.message}`);
        }
        const candles = await (0, db_1.getCandlesFromDb)(info.symbol);
        const stats = await (0, db_1.getCandleStats)(info.symbol);
        seedData[info.symbol] = candles;
        console.log(`  📊 Stored in DB: ${stats.count} candles (${stats.minDate} ~ ${stats.maxDate})\n`);
    }
    // Export to bundled seed JSON
    const dataDir = path_1.default.resolve(__dirname, './data');
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    const seedFilePath = path_1.default.join(dataDir, 'seedCandles.json');
    fs_1.default.writeFileSync(seedFilePath, JSON.stringify(seedData, null, 2), 'utf-8');
    console.log(`✔ [Seed Export] Successfully exported snapshot to ${seedFilePath}`);
    console.log('\n✨ Pre-caching complete! Offline and cloud deployment ready.\n');
}
runPrecache().catch((err) => {
    console.error('Fatal pre-caching error:', err);
    process.exit(1);
});
