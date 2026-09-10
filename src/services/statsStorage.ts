import type { StatsData } from '../StatsModal';

const STORAGE_KEY = 'stock_chart_trainer_history_v1';

export interface SavedQuizResult {
  quizId: string;
  instrument: string;
  cutoffDate: string;
  prediction: '상승' | '횡보' | '하락';
  actualLabel: '상승' | '횡보' | '하락';
  returnPercent: number;
  isCorrect: boolean;
  answeredAt: string;
}

let memoryFallbackHistory: SavedQuizResult[] = [];

function isLocalStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getStoredHistory(): SavedQuizResult[] {
  if (!isLocalStorageAvailable()) {
    return memoryFallbackHistory;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load history from localStorage:', err);
    return memoryFallbackHistory;
  }
}

function setStoredHistory(history: SavedQuizResult[]): void {
  if (!isLocalStorageAvailable()) {
    memoryFallbackHistory = history;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save history to localStorage:', err);
    memoryFallbackHistory = history;
  }
}

export function computeStats(): StatsData {
  const history = getStoredHistory();

  const total = history.length;
  const correct = history.filter(h => h.isCorrect).length;
  const accuracy = total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 0;

  const byInstrument: StatsData['byInstrument'] = {
    sp500: { total: 0, correct: 0, accuracy: 0 },
    nasdaq100: { total: 0, correct: 0, accuracy: 0 }
  };

  const confusionMatrix: StatsData['confusionMatrix'] = {
    상승: { 상승: 0, 횡보: 0, 하락: 0 },
    횡보: { 상승: 0, 횡보: 0, 하락: 0 },
    하락: { 상승: 0, 횡보: 0, 하락: 0 }
  };

  for (const item of history) {
    // By Instrument
    if (!byInstrument[item.instrument]) {
      byInstrument[item.instrument] = { total: 0, correct: 0, accuracy: 0 };
    }
    byInstrument[item.instrument].total += 1;
    if (item.isCorrect) {
      byInstrument[item.instrument].correct += 1;
    }

    // Confusion Matrix
    if (confusionMatrix[item.actualLabel] && confusionMatrix[item.actualLabel][item.prediction] !== undefined) {
      confusionMatrix[item.actualLabel][item.prediction] += 1;
    }
  }

  for (const key of Object.keys(byInstrument)) {
    const inst = byInstrument[key];
    inst.accuracy = inst.total > 0 ? Number(((inst.correct / inst.total) * 100).toFixed(1)) : 0;
  }

  const recentHistory = history.slice(0, 15).map(h => ({
    quizId: h.quizId,
    instrument: h.instrument,
    cutoffDate: h.cutoffDate,
    prediction: h.prediction,
    actualLabel: h.actualLabel,
    returnPercent: Number(h.returnPercent.toFixed(2)),
    isCorrect: h.isCorrect,
    answeredAt: h.answeredAt
  }));

  return {
    total,
    correct,
    accuracy,
    byInstrument,
    confusionMatrix,
    recentHistory
  };
}

export function saveQuizResult(item: SavedQuizResult): StatsData {
  const history = getStoredHistory();
  // Add new item to front of list (newest first)
  const updated = [item, ...history];
  // Limit stored records to last 1000 for storage efficiency
  const trimmed = updated.slice(0, 1000);
  setStoredHistory(trimmed);
  return computeStats();
}

export function resetStats(): StatsData {
  memoryFallbackHistory = [];
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to reset history in localStorage:', err);
    }
  }
  return computeStats();
}

export function getRecentCutoffs(symbol: string, limit: number = 25): string[] {
  const history = getStoredHistory();
  return history
    .filter(h => h.instrument === symbol || (symbol === '^GSPC' && h.instrument === 'sp500') || (symbol === '^NDX' && h.instrument === 'nasdaq100'))
    .slice(0, limit)
    .map(h => h.cutoffDate);
}
