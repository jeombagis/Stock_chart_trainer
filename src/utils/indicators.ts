import type { Time } from 'lightweight-charts';
import type { CandleData } from '../Chart';

export interface LinePoint {
  time: Time;
  value: number;
}

export interface HistogramPoint {
  time: Time;
  value: number;
  color: string;
}

export interface BollingerBandsResult {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(candles: CandleData[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result.push({
    time: candles[period - 1].time,
    value: Number((sum / period).toFixed(2))
  });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result.push({
      time: candles[i].time,
      value: Number((sum / period).toFixed(2))
    });
  }

  return result;
}

/**
 * Bollinger Bands (BB)
 * Standard: 20-period SMA, 2 standard deviations
 */
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsResult {
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  if (candles.length < period) {
    return { upper, middle, lower };
  }

  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    const mean = window.reduce((acc, c) => acc + c.close, 0) / period;
    const variance = window.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const time = candles[i].time;
    upper.push({ time, value: Number((mean + stdDevMultiplier * stdDev).toFixed(2)) });
    middle.push({ time, value: Number(mean.toFixed(2)) });
    lower.push({ time, value: Number((mean - stdDevMultiplier * stdDev).toFixed(2)) });
  }

  return { upper, middle, lower };
}

/**
 * Volume Histogram data with color based on candlestick direction
 */
export function getVolumeData(candles: CandleData[]): HistogramPoint[] {
  return candles.map(c => ({
    time: c.time,
    value: c.volume || 0,
    color: c.close >= c.open 
      ? 'rgba(239, 83, 80, 0.35)' // Red (Bullish)
      : 'rgba(38, 166, 154, 0.35)' // Teal (Bearish)
  }));
}

/**
 * Relative Strength Index (RSI)
 * Standard: 14-period Wilder's RSI
 */
export function calculateRSI(candles: CandleData[], period: number = 14): LinePoint[] {
  const result: LinePoint[] = [];
  if (candles.length <= period) return result;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  result.push({
    time: candles[period].time,
    value: Number(rsi.toFixed(2))
  });

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));

    result.push({
      time: candles[i + 1].time,
      value: Number(rsi.toFixed(2))
    });
  }

  return result;
}
