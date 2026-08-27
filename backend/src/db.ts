import sqlite3 from 'sqlite3';
import path from 'path';

export interface CandleRecord {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuizRecord {
  id: string;
  instrument: string;
  symbol: string;
  cutoff_date: string;
  forecast_end_date: string;
  visible_days: number;
  forecast_days: number;
  sideways_threshold: number;
  actual_label: string;
  return_percent: number;
  status: 'PENDING' | 'ANSWERED' | 'EXPIRED';
  created_at: string;
}

export interface QuizAnswerRecord {
  quiz_id: string;
  prediction: string;
  actual_label: string;
  return_percent: number;
  is_correct: number;
  answered_at: string;
}

const dbPath = path.resolve(__dirname, '../trainer.db');
const db = new sqlite3.Database(dbPath);

// Helper for Promisified db.run
function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper for Promisified db.all
function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Helper for Promisified db.get
function get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

export async function initDb(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS market_candles (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      PRIMARY KEY (symbol, date)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      instrument TEXT NOT NULL,
      symbol TEXT NOT NULL,
      cutoff_date TEXT NOT NULL,
      forecast_end_date TEXT NOT NULL,
      visible_days INTEGER NOT NULL,
      forecast_days INTEGER NOT NULL,
      sideways_threshold REAL NOT NULL,
      actual_label TEXT NOT NULL,
      return_percent REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS quiz_answers (
      quiz_id TEXT PRIMARY KEY,
      prediction TEXT NOT NULL,
      actual_label TEXT NOT NULL,
      return_percent REAL NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at TEXT NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
  `);
}

export async function saveCandles(symbol: string, candles: { date: string; open: number; high: number; low: number; close: number; volume: number }[]): Promise<void> {
  if (candles.length === 0) return;

  await run('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO market_candles (symbol, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of candles) {
      await new Promise<void>((resolve, reject) => {
        stmt.run([symbol, c.date, c.open, c.high, c.low, c.close, c.volume], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await new Promise<void>((resolve, reject) => {
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

export async function getCandlesFromDb(symbol: string, from?: string, to?: string): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  let sql = 'SELECT date, open, high, low, close, volume FROM market_candles WHERE symbol = ?';
  const params: any[] = [symbol];

  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY date ASC';

  const rows = await all<any>(sql, params);
  return rows.map(r => ({
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume
  }));
}

export async function getCandleStats(symbol: string): Promise<{ count: number; minDate: string | null; maxDate: string | null }> {
  const row = await get<{ count: number; minDate: string | null; maxDate: string | null }>(
    `SELECT COUNT(*) as count, MIN(date) as minDate, MAX(date) as maxDate FROM market_candles WHERE symbol = ?`,
    [symbol]
  );
  return row || { count: 0, minDate: null, maxDate: null };
}

export async function saveQuiz(quiz: QuizRecord): Promise<void> {
  await run(`
    INSERT INTO quizzes (
      id, instrument, symbol, cutoff_date, forecast_end_date,
      visible_days, forecast_days, sideways_threshold,
      actual_label, return_percent, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    quiz.id, quiz.instrument, quiz.symbol, quiz.cutoff_date, quiz.forecast_end_date,
    quiz.visible_days, quiz.forecast_days, quiz.sideways_threshold,
    quiz.actual_label, quiz.return_percent, quiz.status, quiz.created_at
  ]);
}

export async function getQuizById(id: string): Promise<QuizRecord | undefined> {
  return await get<QuizRecord>('SELECT * FROM quizzes WHERE id = ?', [id]);
}

export async function saveQuizAnswer(answer: QuizAnswerRecord): Promise<void> {
  await run('BEGIN TRANSACTION');
  try {
    await run(`
      INSERT INTO quiz_answers (quiz_id, prediction, actual_label, return_percent, is_correct, answered_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      answer.quiz_id, answer.prediction, answer.actual_label, answer.return_percent, answer.is_correct, answer.answered_at
    ]);

    await run(`
      UPDATE quizzes SET status = 'ANSWERED' WHERE id = ?
    `, [answer.quiz_id]);

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

export async function getRecentCutoffDates(symbol: string, limit: number = 20): Promise<string[]> {
  const rows = await all<{ cutoff_date: string }>(
    `SELECT cutoff_date FROM quizzes WHERE symbol = ? ORDER BY created_at DESC LIMIT ?`,
    [symbol, limit]
  );
  return rows.map(r => r.cutoff_date);
}

export interface StatsResponse {
  total: number;
  correct: number;
  accuracy: number;
  byInstrument: {
    [key: string]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
  confusionMatrix: {
    // Row: Actual, Column: Predicted
    상승: { 상승: number; 횡보: number; 하락: number };
    횡보: { 상승: number; 횡보: number; 하락: number };
    하락: { 상승: number; 횡보: number; 하락: number };
  };
  recentHistory: {
    quizId: string;
    instrument: string;
    cutoffDate: string;
    prediction: string;
    actualLabel: string;
    returnPercent: number;
    isCorrect: boolean;
    answeredAt: string;
  }[];
}

export async function getOverallStats(): Promise<StatsResponse> {
  const rows = await all<{
    quiz_id: string;
    instrument: string;
    cutoff_date: string;
    prediction: string;
    actual_label: string;
    return_percent: number;
    is_correct: number;
    answered_at: string;
  }>(`
    SELECT 
      q.id as quiz_id,
      q.instrument,
      q.cutoff_date,
      a.prediction,
      a.actual_label,
      a.return_percent,
      a.is_correct,
      a.answered_at
    FROM quiz_answers a
    JOIN quizzes q ON a.quiz_id = q.id
    ORDER BY a.answered_at DESC
  `);

  const total = rows.length;
  const correct = rows.filter(r => r.is_correct === 1).length;
  const accuracy = total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 0;

  const byInstrument: StatsResponse['byInstrument'] = {
    sp500: { total: 0, correct: 0, accuracy: 0 },
    nasdaq100: { total: 0, correct: 0, accuracy: 0 }
  };

  const confusionMatrix: StatsResponse['confusionMatrix'] = {
    상승: { 상승: 0, 횡보: 0, 하락: 0 },
    횡보: { 상승: 0, 횡보: 0, 하락: 0 },
    하락: { 상승: 0, 횡보: 0, 하락: 0 }
  };

  for (const row of rows) {
    // By Instrument
    if (!byInstrument[row.instrument]) {
      byInstrument[row.instrument] = { total: 0, correct: 0, accuracy: 0 };
    }
    byInstrument[row.instrument].total += 1;
    if (row.is_correct === 1) {
      byInstrument[row.instrument].correct += 1;
    }

    // Confusion Matrix
    const actual = row.actual_label as '상승' | '횡보' | '하락';
    const pred = row.prediction as '상승' | '횡보' | '하락';
    if (confusionMatrix[actual] && confusionMatrix[actual][pred] !== undefined) {
      confusionMatrix[actual][pred] += 1;
    }
  }

  for (const key of Object.keys(byInstrument)) {
    const inst = byInstrument[key];
    inst.accuracy = inst.total > 0 ? Number(((inst.correct / inst.total) * 100).toFixed(1)) : 0;
  }

  const recentHistory = rows.slice(0, 15).map(r => ({
    quizId: r.quiz_id,
    instrument: r.instrument,
    cutoffDate: r.cutoff_date,
    prediction: r.prediction,
    actualLabel: r.actual_label,
    returnPercent: Number(r.return_percent.toFixed(2)),
    isCorrect: r.is_correct === 1,
    answeredAt: r.answered_at
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
