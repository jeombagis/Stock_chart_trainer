import seedCandlesJson from '../data/seedCandles.json';

export interface Candle {
  date: string; // YYYY-MM-DD
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
  candleCount: number;
  minDate: string | null;
  maxDate: string | null;
}

export const INSTRUMENTS: Record<string, { symbol: string; name: string }> = {
  sp500: { symbol: '^GSPC', name: 'S&P 500' },
  nasdaq100: { symbol: '^NDX', name: 'NASDAQ-100' }
};

const marketDataMap: Record<string, Candle[]> = seedCandlesJson as Record<string, Candle[]>;

export function getInstrumentList(): Instrument[] {
  const list: Instrument[] = [];
  for (const [id, info] of Object.entries(INSTRUMENTS)) {
    const candles = marketDataMap[info.symbol] || [];
    const count = candles.length;
    list.push({
      id,
      symbol: info.symbol,
      name: info.name,
      candleCount: count,
      minDate: count > 0 ? candles[0].date : null,
      maxDate: count > 0 ? candles[count - 1].date : null
    });
  }
  return list;
}

export function getCandlesForInstrument(instrumentId: string): { symbol: string; name: string; candles: Candle[] } {
  const info = INSTRUMENTS[instrumentId] || INSTRUMENTS['sp500'];
  const candles = marketDataMap[info.symbol] || [];
  return {
    symbol: info.symbol,
    name: info.name,
    candles
  };
}
