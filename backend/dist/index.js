"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const db_1 = require("./db");
const MarketDataProvider_1 = require("./MarketDataProvider");
const QuizService_1 = require("./QuizService");
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const dataProvider = new MarketDataProvider_1.YahooMarketDataProvider();
const quizService = new QuizService_1.QuizService(dataProvider);
// Zod schemas
const CreateQuizSchema = zod_1.z.object({
    instrument: zod_1.z.enum(['sp500', 'nasdaq100']).optional().default('sp500'),
    visibleDays: zod_1.z.number().int().min(10).max(200).optional().default(60),
    forecastDays: zod_1.z.number().int().min(5).max(100).optional().default(20),
    sidewaysThreshold: zod_1.z.number().min(0).max(20).optional().default(2.0),
});
const AnswerQuizSchema = zod_1.z.object({
    prediction: zod_1.z.enum(['상승', '횡보', '하락']),
});
// API: 지수 목록 및 데이터 상태 반환
app.get('/api/instruments', async (req, res) => {
    try {
        const instruments = await dataProvider.getInstrumentList();
        res.json({ instruments, status: 'ok' });
    }
    catch (error) {
        console.error('Failed to get instruments:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// API: 새 문제 출제 (노출 캔들만 반환, 미래 데이터 은닉)
app.post('/api/quizzes', async (req, res) => {
    try {
        const parsed = CreateQuizSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid parameters', details: parsed.error.issues });
        }
        const quiz = await quizService.createQuiz(parsed.data);
        res.json({
            status: 'ok',
            quiz
        });
    }
    catch (error) {
        console.error('Failed to create quiz:', error);
        res.status(500).json({ error: error.message || 'Failed to generate quiz' });
    }
});
// API: 퀴즈 답안 제출 및 결과 확인
app.post('/api/quizzes/:id/answer', async (req, res) => {
    try {
        const { id } = req.params;
        const parsed = AnswerQuizSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid prediction value. Must be 상승, 횡보, or 하락.', details: parsed.error.issues });
        }
        const result = await quizService.answerQuiz(id, parsed.data.prediction);
        res.json({
            status: 'ok',
            ...result
        });
    }
    catch (error) {
        console.error(`Failed to answer quiz ${req.params.id}:`, error);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to submit answer' });
    }
});
// API: 전체/지수별 정답률 및 혼동 행렬 통계 조회
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await (0, db_1.getOverallStats)();
        res.json({
            status: 'ok',
            stats
        });
    }
    catch (error) {
        console.error('Failed to get stats:', error);
        res.status(500).json({ error: error.message || 'Failed to retrieve stats' });
    }
});
// API: 수동 데이터 갱신
app.post('/api/data/refresh', async (req, res) => {
    try {
        const results = {};
        for (const [id, info] of Object.entries(MarketDataProvider_1.INSTRUMENTS)) {
            results[id] = await dataProvider.syncSymbol(info.symbol);
        }
        const instruments = await dataProvider.getInstrumentList();
        res.json({ status: 'ok', synced: results, instruments });
    }
    catch (error) {
        console.error('Failed to refresh data:', error);
        res.status(500).json({ error: error.message || 'Failed to refresh data' });
    }
});
// Startup sequence
async function startServer() {
    try {
        await (0, db_1.initDb)();
        console.log('[DB] SQLite database initialized successfully.');
        // Background sync on startup (non-blocking)
        (async () => {
            for (const [id, info] of Object.entries(MarketDataProvider_1.INSTRUMENTS)) {
                try {
                    await dataProvider.syncSymbol(info.symbol);
                }
                catch (err) {
                    console.warn(`[Startup Sync] Initial sync failed for ${id}:`, err);
                }
            }
        })();
        app.listen(port, () => {
            console.log(`Backend server running at http://localhost:${port}`);
        });
    }
    catch (err) {
        console.error('Fatal: Failed to start backend server:', err);
        process.exit(1);
    }
}
startServer();
