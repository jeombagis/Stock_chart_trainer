export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
}

export interface MarketDataProvider {
  getDailyHistory(symbol: string, from: string, to: string): Promise<Candle[]>;
}

// Mock Implementation for Stage 1 (Fixture data)
export class MockMarketDataProvider implements MarketDataProvider {
  private generateMockCandles(from: string, to: string, startPrice: number = 100): Candle[] {
    const candles: Candle[] = [];
    let currentDate = new Date(from);
    const endDate = new Date(to);
    let currentPrice = startPrice;

    while (currentDate <= endDate) {
      // Skip weekends
      const day = currentDate.getDay();
      if (day !== 0 && day !== 6) {
        const open = currentPrice;
        const change = (Math.random() - 0.5) * 5; // Random fluctuation
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        const volume = Math.floor(Math.random() * 1000000) + 500000;

        candles.push({
          date: currentDate.toISOString().split('T')[0],
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume
        });
        
        currentPrice = close;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return candles;
  }

  async getDailyHistory(symbol: string, from: string, to: string): Promise<Candle[]> {
    // Generate mock data based on symbol
    const startPrice = symbol === '^GSPC' ? 5000 : 18000;
    return this.generateMockCandles(from, to, startPrice);
  }
}
