"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.saveCandles = saveCandles;
exports.getCandlesFromDb = getCandlesFromDb;
exports.getCandleStats = getCandleStats;
exports.saveQuiz = saveQuiz;
exports.getQuizById = getQuizById;
exports.saveQuizAnswer = saveQuizAnswer;
exports.getRecentCutoffDates = getRecentCutoffDates;
exports.getOverallStats = getOverallStats;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.resolve(__dirname, '../trainer.db');
const db = new sqlite3_1.default.Database(dbPath);
// Helper for Promisified db.run
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
// Helper for Promisified db.all
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
// Helper for Promisified db.get
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
async function initDb() {
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
async function saveCandles(symbol, candles) {
    if (candles.length === 0)
        return;
    await run('BEGIN TRANSACTION');
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO market_candles (symbol, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        for (const c of candles) {
            await new Promise((resolve, reject) => {
                stmt.run([symbol, c.date, c.open, c.high, c.low, c.close, c.volume], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        await new Promise((resolve, reject) => {
            stmt.finalize((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        await run('COMMIT');
    }
    catch (error) {
        await run('ROLLBACK');
        throw error;
    }
}
async function getCandlesFromDb(symbol, from, to) {
    let sql = 'SELECT date, open, high, low, close, volume FROM market_candles WHERE symbol = ?';
    const params = [symbol];
    if (from) {
        sql += ' AND date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND date <= ?';
        params.push(to);
    }
    sql += ' ORDER BY date ASC';
    const rows = await all(sql, params);
    return rows.map(r => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume
    }));
}
async function getCandleStats(symbol) {
    const row = await get(`SELECT COUNT(*) as count, MIN(date) as minDate, MAX(date) as maxDate FROM market_candles WHERE symbol = ?`, [symbol]);
    return row || { count: 0, minDate: null, maxDate: null };
}
async function saveQuiz(quiz) {
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
async function getQuizById(id) {
    return await get('SELECT * FROM quizzes WHERE id = ?', [id]);
}
async function saveQuizAnswer(answer) {
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
    }
    catch (error) {
        await run('ROLLBACK');
        throw error;
    }
}
async function getRecentCutoffDates(symbol, limit = 20) {
    const rows = await all(`SELECT cutoff_date FROM quizzes WHERE symbol = ? ORDER BY created_at DESC LIMIT ?`, [symbol, limit]);
    return rows.map(r => r.cutoff_date);
}
async function getOverallStats() {
    const rows = await all(`
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
    const byInstrument = {
        sp500: { total: 0, correct: 0, accuracy: 0 },
        nasdaq100: { total: 0, correct: 0, accuracy: 0 }
    };
    const confusionMatrix = {
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
        const actual = row.actual_label;
        const pred = row.prediction;
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
