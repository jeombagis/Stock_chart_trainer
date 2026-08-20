"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const MarketDataProvider_1 = require("./MarketDataProvider");
const db_1 = require("./db");
class QuizService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async createQuiz(config = {}) {
        const instrument = config.instrument && MarketDataProvider_1.INSTRUMENTS[config.instrument] ? config.instrument : 'sp500';
        const symbol = MarketDataProvider_1.INSTRUMENTS[instrument].symbol;
        const visibleDays = Math.max(10, Math.min(config.visibleDays || 60, 200));
        const forecastDays = Math.max(5, Math.min(config.forecastDays || 20, 100));
        const sidewaysThreshold = config.sidewaysThreshold != null && config.sidewaysThreshold >= 0
            ? Number(config.sidewaysThreshold)
            : 2.0;
        const allCandles = await this.provider.getDailyHistory(symbol);
        const requiredCandles = visibleDays + forecastDays;
        if (allCandles.length < requiredCandles) {
            throw new Error(`Insufficient historical data for ${instrument}. Required at least ${requiredCandles} candles.`);
        }
        // Valid cutoff index range: [visibleDays - 1, allCandles.length - forecastDays - 1]
        const minIndex = visibleDays - 1;
        const maxIndex = allCandles.length - forecastDays - 1;
        // Get recent cutoff dates to avoid repetition
        const recentCutoffs = new Set(await (0, db_1.getRecentCutoffDates)(symbol, 25));
        const candidateIndices = [];
        for (let idx = minIndex; idx <= maxIndex; idx++) {
            if (!recentCutoffs.has(allCandles[idx].date)) {
                candidateIndices.push(idx);
            }
        }
        // If candidate pool too small due to filtering, use all valid indices
        const availablePool = candidateIndices.length > 10
            ? candidateIndices
            : Array.from({ length: maxIndex - minIndex + 1 }, (_, k) => k + minIndex);
        // Pick random index
        const chosenIndex = availablePool[Math.floor(Math.random() * availablePool.length)];
        const cutoffCandle = allCandles[chosenIndex];
        const cutoffDate = cutoffCandle.date;
        const forecastEndCandle = allCandles[chosenIndex + forecastDays];
        const forecastEndDate = forecastEndCandle.date;
        const visibleCandles = allCandles.slice(chosenIndex - visibleDays + 1, chosenIndex + 1);
        // Calculate actual return
        const cutoffClose = cutoffCandle.close;
        const forecastClose = forecastEndCandle.close;
        const returnPercent = Number((((forecastClose - cutoffClose) / cutoffClose) * 100).toFixed(2));
        // Determine label
        let actualLabel = '횡보';
        if (returnPercent > sidewaysThreshold) {
            actualLabel = '상승';
        }
        else if (returnPercent < -sidewaysThreshold) {
            actualLabel = '하락';
        }
        const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const record = {
            id: quizId,
            instrument,
            symbol,
            cutoff_date: cutoffDate,
            forecast_end_date: forecastEndDate,
            visible_days: visibleDays,
            forecast_days: forecastDays,
            sideways_threshold: sidewaysThreshold,
            actual_label: actualLabel,
            return_percent: returnPercent,
            status: 'PENDING',
            created_at: new Date().toISOString()
        };
        await (0, db_1.saveQuiz)(record);
        return {
            quizId,
            instrument,
            symbol,
            cutoffDate,
            visibleDays,
            forecastDays,
            sidewaysThreshold,
            visibleCandles
        };
    }
    async answerQuiz(quizId, prediction) {
        if (!['상승', '횡보', '하락'].includes(prediction)) {
            throw new Error("Invalid prediction. Must be one of '상승', '횡보', '하락'.");
        }
        const quiz = await (0, db_1.getQuizById)(quizId);
        if (!quiz) {
            const err = new Error('Quiz not found');
            err.status = 404;
            throw err;
        }
        if (quiz.status === 'ANSWERED') {
            const err = new Error('Quiz has already been answered');
            err.status = 400;
            throw err;
        }
        const isCorrect = prediction === quiz.actual_label;
        await (0, db_1.saveQuizAnswer)({
            quiz_id: quizId,
            prediction,
            actual_label: quiz.actual_label,
            return_percent: quiz.return_percent,
            is_correct: isCorrect ? 1 : 0,
            answered_at: new Date().toISOString()
        });
        // Fetch the revealed future candles (from cutoffDate + 1 to forecast_end_date)
        const allCandles = await this.provider.getDailyHistory(quiz.symbol);
        const cutoffIndex = allCandles.findIndex(c => c.date === quiz.cutoff_date);
        const endIndex = allCandles.findIndex(c => c.date === quiz.forecast_end_date);
        let revealedCandles = [];
        if (cutoffIndex !== -1 && endIndex !== -1) {
            revealedCandles = allCandles.slice(cutoffIndex + 1, endIndex + 1);
        }
        else {
            // Fallback
            revealedCandles = await (0, db_1.getCandlesFromDb)(quiz.symbol, quiz.cutoff_date, quiz.forecast_end_date);
            revealedCandles = revealedCandles.filter(c => c.date > quiz.cutoff_date);
        }
        const stats = await (0, db_1.getOverallStats)();
        return {
            quizId,
            prediction,
            actualLabel: quiz.actual_label,
            returnPercent: quiz.return_percent,
            isCorrect,
            revealedCandles,
            stats
        };
    }
}
exports.QuizService = QuizService;
