import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { initDb, getOverallStats } from './db';
import { YahooMarketDataProvider, INSTRUMENTS } from './MarketDataProvider';
import { QuizService } from './QuizService';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const dataProvider = new YahooMarketDataProvider();
const quizService = new QuizService(dataProvider);

// Zod schemas
const CreateQuizSchema = z.object({
  instrument: z.enum(['sp500', 'nasdaq100']).optional().default('sp500'),
  visibleDays: z.number().int().min(10).max(200).optional().default(60),
  forecastDays: z.number().int().min(5).max(100).optional().default(20),
  sidewaysThreshold: z.number().min(0).max(20).optional().default(2.0),
});

const AnswerQuizSchema = z.object({
  prediction: z.enum(['상승', '횡보', '하락']),
});

// API: 지수 목록 및 데이터 상태 반환
app.get('/api/instruments', async (req, res) => {
  try {
    const instruments = await dataProvider.getInstrumentList();
    res.json({ instruments, status: 'ok' });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error(`Failed to answer quiz ${req.params.id}:`, error);
    const statusCode = error.status || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to submit answer' });
  }
});

// API: 전체/지수별 정답률 및 혼동 행렬 통계 조회
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getOverallStats();
    res.json({
      status: 'ok',
      stats
    });
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve stats' });
  }
});

// API: 수동 데이터 갱신
app.post('/api/data/refresh', async (req, res) => {
  try {
    const results: Record<string, number> = {};
    for (const [id, info] of Object.entries(INSTRUMENTS)) {
      results[id] = await dataProvider.syncSymbol(info.symbol);
    }
    const instruments = await dataProvider.getInstrumentList();
    res.json({ status: 'ok', synced: results, instruments });
  } catch (error: any) {
    console.error('Failed to refresh data:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh data' });
  }
});

// Startup sequence
async function startServer() {
  try {
    await initDb();
    console.log('[DB] SQLite database initialized successfully.');

    // Seed from bundled pre-cached data if DB is empty
    await dataProvider.seedAllFromLocalFile();

    // Background sync on startup (non-blocking)
    (async () => {
      for (const [id, info] of Object.entries(INSTRUMENTS)) {
        try {
          await dataProvider.syncSymbol(info.symbol);
        } catch (err) {
          console.warn(`[Startup Sync] Initial sync failed for ${id}:`, err);
        }
      }
    })();

    app.listen(port, () => {
      console.log(`Backend server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Fatal: Failed to start backend server:', err);
    process.exit(1);
  }
}

startServer();
