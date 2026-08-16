import express from 'express';
import cors from 'cors';
import { MockMarketDataProvider, Instrument } from './MarketDataProvider';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dataProvider = new MockMarketDataProvider();

// API: 지수 목록 및 상태 반환
app.get('/api/instruments', async (req, res) => {
  const instruments: Instrument[] = [
    { id: 'sp500', symbol: '^GSPC', name: 'S&P 500' },
    { id: 'nasdaq100', symbol: '^NDX', name: 'NASDAQ-100' }
  ];
  res.json({ instruments, status: 'ok' });
});

// API: 새로운 퀴즈 출제 (노출 캔들만 반환)
app.post('/api/quizzes', async (req, res) => {
  const { instrument, visibleDays = 60, forecastDays = 20 } = req.body;
  
  // TODO: 실제로는 무작위 기준일(cutoffDate)을 골라서 데이터 반환 (현재는 임의의 최근 날짜로 모의 테스트)
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - visibleDays - forecastDays); // 전체 필요한 데이터 범위
  
  const fromDateString = fromDate.toISOString().split('T')[0];
  const toDateString = toDate.toISOString().split('T')[0];
  
  const allCandles = await dataProvider.getDailyHistory(
    instrument === 'sp500' ? '^GSPC' : '^NDX', 
    fromDateString, 
    toDateString
  );
  
  // 기준일(cutoff)을 뒤에서 forecastDays 만큼 뺀 날짜로 설정
  const cutoffIndex = allCandles.length - forecastDays - 1;
  const visibleCandles = allCandles.slice(0, cutoffIndex + 1);
  const cutoffDate = visibleCandles[visibleCandles.length - 1].date;
  
  const quizId = `quiz_${Date.now()}`;
  
  // TODO: DB(SQLite)에 quizId, instrument, cutoffDate 저장
  
  res.json({
    quizId,
    instrument,
    cutoffDate,
    visibleDays: visibleCandles.length,
    visibleCandles
  });
});

// API: 퀴즈 정답 제출 (예측 결과 및 후속 캔들 반환)
app.post('/api/quizzes/:id/answer', async (req, res) => {
  const { id } = req.params;
  const { prediction } = req.body; // '상승' | '횡보' | '하락'
  
  // TODO: DB에서 id로 퀴즈 정보(cutoffDate, instrument) 조회
  // 현재는 Mock으로 무조건 상승이 정답인 것처럼 가짜 데이터 반환
  
  const mockRevealedCandles = await dataProvider.getDailyHistory('^GSPC', '2023-01-01', '2023-01-20');
  
  res.json({
    quizId: id,
    prediction,
    actualLabel: '상승',
    returnPercent: 3.5,
    isCorrect: prediction === '상승',
    revealedCandles: mockRevealedCandles
  });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
