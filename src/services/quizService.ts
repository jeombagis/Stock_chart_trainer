import { getCandlesForInstrument, type Candle } from './marketData';
import { saveQuizResult, getRecentCutoffs } from './statsStorage';
import type { StatsData } from '../StatsModal';

export interface QuizConfig {
  instrument?: string;
  visibleDays?: number;
  forecastDays?: number;
  sidewaysThreshold?: number;
}

export interface QuizPublicData {
  quizId: string;
  instrument: string;
  symbol: string;
  cutoffDate: string;
  visibleDays: number;
  forecastDays: number;
  sidewaysThreshold: number;
  visibleCandles: Candle[];
}

export interface ActiveQuizSession {
  quizId: string;
  instrument: string;
  symbol: string;
  cutoffDate: string;
  forecastEndDate: string;
  visibleDays: number;
  forecastDays: number;
  sidewaysThreshold: number;
  visibleCandles: Candle[];
  revealedCandles: Candle[];
  actualLabel: '상승' | '횡보' | '하락';
  returnPercent: number;
}

export interface AnswerResult {
  quizId: string;
  prediction: string;
  actualLabel: string;
  returnPercent: number;
  isCorrect: boolean;
  revealedCandles: Candle[];
  stats: StatsData;
}

export function createQuizSession(config: QuizConfig = {}): { publicData: QuizPublicData; session: ActiveQuizSession } {
  const instrument = config.instrument || 'sp500';
  const { symbol, candles } = getCandlesForInstrument(instrument);

  const visibleDays = Math.max(10, Math.min(config.visibleDays || 60, 200));
  const forecastDays = Math.max(5, Math.min(config.forecastDays || 20, 100));
  const sidewaysThreshold = config.sidewaysThreshold != null && config.sidewaysThreshold >= 0
    ? Number(config.sidewaysThreshold)
    : 2.0;

  const requiredCandles = visibleDays + forecastDays;
  if (candles.length < requiredCandles) {
    throw new Error(`데이터가 부족합니다 (${instrument}). 최소 ${requiredCandles}개의 캔들이 필요합니다.`);
  }

  // Valid cutoff index range: [visibleDays - 1, candles.length - forecastDays - 1]
  const minIndex = visibleDays - 1;
  const maxIndex = candles.length - forecastDays - 1;

  // Recent cutoffs to avoid immediate repetition
  const recentCutoffs = new Set(getRecentCutoffs(instrument, 25));

  const candidateIndices: number[] = [];
  for (let idx = minIndex; idx <= maxIndex; idx++) {
    if (!recentCutoffs.has(candles[idx].date)) {
      candidateIndices.push(idx);
    }
  }

  const availablePool = candidateIndices.length > 10
    ? candidateIndices
    : Array.from({ length: maxIndex - minIndex + 1 }, (_, k) => k + minIndex);

  const chosenIndex = availablePool[Math.floor(Math.random() * availablePool.length)];

  const cutoffCandle = candles[chosenIndex];
  const cutoffDate = cutoffCandle.date;
  const forecastEndCandle = candles[chosenIndex + forecastDays];
  const forecastEndDate = forecastEndCandle.date;

  const visibleCandles = candles.slice(chosenIndex - visibleDays + 1, chosenIndex + 1);
  const revealedCandles = candles.slice(chosenIndex + 1, chosenIndex + forecastDays + 1);

  // Calculate return percent
  const cutoffClose = cutoffCandle.close;
  const forecastClose = forecastEndCandle.close;
  const returnPercent = Number((((forecastClose - cutoffClose) / cutoffClose) * 100).toFixed(2));

  // Determine direction
  let actualLabel: '상승' | '횡보' | '하락' = '횡보';
  if (returnPercent > sidewaysThreshold) {
    actualLabel = '상승';
  } else if (returnPercent < -sidewaysThreshold) {
    actualLabel = '하락';
  }

  const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const session: ActiveQuizSession = {
    quizId,
    instrument,
    symbol,
    cutoffDate,
    forecastEndDate,
    visibleDays,
    forecastDays,
    sidewaysThreshold,
    visibleCandles,
    revealedCandles,
    actualLabel,
    returnPercent
  };

  const publicData: QuizPublicData = {
    quizId,
    instrument,
    symbol,
    cutoffDate,
    visibleDays,
    forecastDays,
    sidewaysThreshold,
    visibleCandles
  };

  return { publicData, session };
}

export function evaluateQuizAnswer(
  session: ActiveQuizSession,
  prediction: '상승' | '횡보' | '하락'
): AnswerResult {
  const isCorrect = prediction === session.actualLabel;

  const updatedStats = saveQuizResult({
    quizId: session.quizId,
    instrument: session.instrument,
    cutoffDate: session.cutoffDate,
    prediction,
    actualLabel: session.actualLabel,
    returnPercent: session.returnPercent,
    isCorrect,
    answeredAt: new Date().toISOString()
  });

  return {
    quizId: session.quizId,
    prediction,
    actualLabel: session.actualLabel,
    returnPercent: session.returnPercent,
    isCorrect,
    revealedCandles: session.revealedCandles,
    stats: updatedStats
  };
}
