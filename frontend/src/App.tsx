import { useState, useEffect, useCallback } from 'react';
import { Chart } from './Chart';
import type { CandleData, IndicatorsConfig } from './Chart';
import { StatsModal } from './StatsModal';
import type { StatsData } from './StatsModal';
import './App.css';

interface Instrument {
  id: string;
  symbol: string;
  name: string;
  candleCount?: number;
  minDate?: string | null;
  maxDate?: string | null;
}

interface QuizData {
  quizId: string;
  instrument: string;
  symbol: string;
  cutoffDate: string;
  visibleDays: number;
  forecastDays: number;
  sidewaysThreshold: number;
  visibleCandles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

interface AnswerResult {
  quizId: string;
  prediction: string;
  actualLabel: string;
  returnPercent: number;
  isCorrect: boolean;
  revealedCandles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  stats: StatsData;
}

export function App() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('sp500');
  
  // Quiz parameters
  const [visibleDays, setVisibleDays] = useState<number>(60);
  const [forecastDays, setForecastDays] = useState<number>(20);
  const [sidewaysThreshold, setSidewaysThreshold] = useState<number>(2.0);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Technical Indicators Configuration
  const [indicators, setIndicators] = useState<IndicatorsConfig>({
    bollingerBands: true,
    sma5: true,
    sma20: true,
    sma60: true,
    sma120: false,
    volume: true,
    rsi: false,
  });

  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [visibleCandles, setVisibleCandles] = useState<CandleData[]>([]);
  const [revealedCandles, setRevealedCandles] = useState<CandleData[]>([]);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Stats & Modal
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  // Toggle helper
  const toggleIndicator = (key: keyof IndicatorsConfig) => {
    setIndicators(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Fetch initial instruments and stats
  const fetchInstruments = useCallback(async () => {
    try {
      const res = await fetch('/api/instruments');
      const data = await res.json();
      if (data.status === 'ok') {
        setInstruments(data.instruments);
      }
    } catch (err) {
      console.error('Failed to fetch instruments:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.status === 'ok') {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
    fetchStats();
  }, [fetchInstruments, fetchStats]);

  // Start new quiz
  const startQuiz = useCallback(async () => {
    setLoading(true);
    setAnswerResult(null);
    setRevealedCandles([]);

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: selectedInstrument,
          visibleDays,
          forecastDays,
          sidewaysThreshold
        })
      });

      const data = await res.json();
      if (data.status === 'ok' && data.quiz) {
        setQuizData(data.quiz);
        const formatted: CandleData[] = data.quiz.visibleCandles.map((c: any) => ({
          time: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }));
        setVisibleCandles(formatted);
      } else {
        alert(data.error || '퀴즈를 생성하지 못했습니다.');
      }
    } catch (err) {
      console.error('Quiz creation error:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedInstrument, visibleDays, forecastDays, sidewaysThreshold]);

  // Submit answer
  const submitAnswer = useCallback(async (prediction: string) => {
    if (!quizData || submitting || answerResult) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/quizzes/${quizData.quizId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction })
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setAnswerResult(data);
        if (data.stats) {
          setStats(data.stats);
        }

        if (data.revealedCandles && data.revealedCandles.length > 0) {
          const formattedRevealed: CandleData[] = data.revealedCandles.map((c: any) => ({
            time: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
          }));
          setRevealedCandles(formattedRevealed);
        }
      } else {
        alert(data.error || '답안 제출 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Answer submission error:', err);
      alert('답안 제출 중 통신 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [quizData, submitting, answerResult]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (!quizData) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startQuiz();
        }
        return;
      }

      // When quiz is in progress (waiting for prediction)
      if (!answerResult && !submitting) {
        if (e.key === '1' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'u') {
          e.preventDefault();
          submitAnswer('상승');
        } else if (e.key === '2' || e.key === 'ArrowRight' || e.key.toLowerCase() === 's') {
          e.preventDefault();
          submitAnswer('횡보');
        } else if (e.key === '3' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          submitAnswer('하락');
        }
      }

      // When result is shown (waiting for next quiz)
      if (answerResult) {
        if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          startQuiz();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizData, answerResult, submitting, submitAnswer, startQuiz]);

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="nav-left">
          <div className="brand-logo">📈 Chart Trainer</div>
          <div className="brand-badge">S&P 500 · NASDAQ-100</div>
        </div>

        <div className="nav-right">
          {stats && (
            <button className="stats-pill-btn" onClick={() => setIsStatsOpen(true)}>
              <span className="pill-icon">📊</span>
              <span>전적: <strong>{stats.correct}/{stats.total}</strong> ({stats.accuracy}%)</span>
            </button>
          )}

          <button 
            className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="난이도 및 설정"
          >
            ⚙️ 설정
          </button>
        </div>
      </header>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-grid">
            <div className="setting-item">
              <label>노출 캔들 기간</label>
              <select value={visibleDays} onChange={e => setVisibleDays(Number(e.target.value))}>
                <option value={30}>30 거래일 (~1.5개월)</option>
                <option value={60}>60 거래일 (~3개월, 기본)</option>
                <option value={90}>90 거래일 (~4.5개월)</option>
                <option value={120}>120 거래일 (~6개월)</option>
              </select>
            </div>

            <div className="setting-item">
              <label>예측 대상 기간</label>
              <select value={forecastDays} onChange={e => setForecastDays(Number(e.target.value))}>
                <option value={10}>10 거래일 (~2주)</option>
                <option value={20}>20 거래일 (~1개월, 기본)</option>
                <option value={40}>40 거래일 (~2개월)</option>
                <option value={60}>60 거래일 (~3개월)</option>
              </select>
            </div>

            <div className="setting-item">
              <label>횡보 판정 임계값 (±%)</label>
              <select value={sidewaysThreshold} onChange={e => setSidewaysThreshold(Number(e.target.value))}>
                <option value={1.0}>±1.0% (민감)</option>
                <option value={2.0}>±2.0% (기본)</option>
                <option value={3.0}>±3.0% (보통)</option>
                <option value={5.0}>±5.0% (관대)</option>
              </select>
            </div>
          </div>
          <div className="settings-hint">
            💡 기준일 종가 대비 {forecastDays}거래일 후 종가의 수익률이 +{sidewaysThreshold}% 초과면 상승, -{sidewaysThreshold}% 미만이면 하락, 그 사이는 횡보로 판정됩니다.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-viewport">
        {/* Instrument Control Bar */}
        <div className="instrument-bar">
          <div className="inst-selector-group">
            <label>훈련 지수:</label>
            <div className="inst-buttons">
              {instruments.map(inst => (
                <button
                  key={inst.id}
                  className={`inst-btn ${selectedInstrument === inst.id ? 'selected' : ''}`}
                  onClick={() => setSelectedInstrument(inst.id)}
                  disabled={loading}
                >
                  {inst.id === 'sp500' ? '🇺🇸 S&P 500' : '🚀 NASDAQ-100'}
                  {inst.candleCount ? <span className="candle-count">({inst.candleCount.toLocaleString()}일)</span> : null}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn-start-action" 
            onClick={startQuiz} 
            disabled={loading}
          >
            {loading ? '데이터 탐색 중...' : (quizData ? '🔄 새로운 무작위 문제' : '🚀 훈련 시작 (Start Quiz)')}
          </button>
        </div>

        {/* Quiz Canvas */}
        {quizData ? (
          <div className="quiz-card">
            <div className="quiz-header-bar">
              <div className="quiz-meta-left">
                <span className="badge-inst">{quizData.instrument === 'sp500' ? 'S&P 500' : 'NASDAQ-100'}</span>
                <span className="meta-text">
                  예측 기준일: <strong className="highlight-date">{quizData.cutoffDate}</strong>
                </span>
                <span className="meta-text">
                  (앞으로 <strong>{quizData.forecastDays}거래일</strong>의 방향을 맞춰보세요)
                </span>
              </div>
              <div className="quiz-meta-right">
                <span className="threshold-pill">횡보 기준: ±{quizData.sidewaysThreshold}%</span>
              </div>
            </div>

            {/* Technical Indicators Toolbar */}
            <div className="indicators-toolbar">
              <div className="toolbar-title">보조지표:</div>
              <div className="indicator-chips">
                <button 
                  className={`chip-btn ${indicators.bollingerBands ? 'active bb' : ''}`}
                  onClick={() => toggleIndicator('bollingerBands')}
                >
                  <span className="chip-indicator dot-bb"></span>
                  볼린저 밴드(20, 2)
                </button>

                <button 
                  className={`chip-btn ${indicators.sma5 ? 'active sma5' : ''}`}
                  onClick={() => toggleIndicator('sma5')}
                >
                  <span className="chip-indicator dot-sma5"></span>
                  5일선
                </button>

                <button 
                  className={`chip-btn ${indicators.sma20 ? 'active sma20' : ''}`}
                  onClick={() => toggleIndicator('sma20')}
                >
                  <span className="chip-indicator dot-sma20"></span>
                  20일선
                </button>

                <button 
                  className={`chip-btn ${indicators.sma60 ? 'active sma60' : ''}`}
                  onClick={() => toggleIndicator('sma60')}
                >
                  <span className="chip-indicator dot-sma60"></span>
                  60일선
                </button>

                <button 
                  className={`chip-btn ${indicators.sma120 ? 'active sma120' : ''}`}
                  onClick={() => toggleIndicator('sma120')}
                >
                  <span className="chip-indicator dot-sma120"></span>
                  120일선
                </button>

                <button 
                  className={`chip-btn ${indicators.volume ? 'active vol' : ''}`}
                  onClick={() => toggleIndicator('volume')}
                >
                  <span className="chip-indicator dot-vol"></span>
                  거래량
                </button>

                <button 
                  className={`chip-btn ${indicators.rsi ? 'active rsi' : ''}`}
                  onClick={() => toggleIndicator('rsi')}
                >
                  <span className="chip-indicator dot-rsi"></span>
                  RSI(14)
                </button>
              </div>
            </div>

            {/* Candlestick Chart */}
            <div className="chart-box">
              {visibleCandles.length > 0 && (
                <Chart 
                  visibleData={visibleCandles} 
                  revealedData={revealedCandles}
                  cutoffDate={quizData.cutoffDate}
                  isAnswered={!!answerResult}
                  indicators={indicators}
                />
              )}
            </div>

            {/* Action Bar (Pending vs Answered) */}
            {!answerResult ? (
              <div className="prediction-dock">
                <div className="dock-title">
                  <span>다음 {quizData.forecastDays}일간의 주가 방향을 예측하세요</span>
                  <span className="dock-shortcuts-guide">단축키: 1/2/3 또는 방향키(↑/→/↓)</span>
                </div>

                <div className="action-buttons-grid">
                  <button 
                    className="pred-btn btn-up" 
                    onClick={() => submitAnswer('상승')}
                    disabled={submitting}
                  >
                    <div className="key-badge">1 or ↑</div>
                    <div className="pred-icon">🔺</div>
                    <div className="pred-label">상승 (Up)</div>
                    <div className="pred-rule">&gt; +{quizData.sidewaysThreshold}%</div>
                  </button>

                  <button 
                    className="pred-btn btn-sideways" 
                    onClick={() => submitAnswer('횡보')}
                    disabled={submitting}
                  >
                    <div className="key-badge">2 or →</div>
                    <div className="pred-icon">↔️</div>
                    <div className="pred-label">횡보 (Sideways)</div>
                    <div className="pred-rule">±{quizData.sidewaysThreshold}% 이내</div>
                  </button>

                  <button 
                    className="pred-btn btn-down" 
                    onClick={() => submitAnswer('하락')}
                    disabled={submitting}
                  >
                    <div className="key-badge">3 or ↓</div>
                    <div className="pred-icon">🔻</div>
                    <div className="pred-label">하락 (Down)</div>
                    <div className="pred-rule">&lt; -{quizData.sidewaysThreshold}%</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className={`result-card ${answerResult.isCorrect ? 'result-correct' : 'result-wrong'}`}>
                <div className="result-headline">
                  <span className="result-icon">{answerResult.isCorrect ? '🎉' : '💔'}</span>
                  <span className="result-title">
                    {answerResult.isCorrect ? '정답입니다!' : '아쉽게 틀렸습니다!'}
                  </span>
                </div>

                <div className="result-stats-row">
                  <div className="result-stat-box">
                    <span className="label">내 예측</span>
                    <span className={`val tag-${answerResult.prediction}`}>{answerResult.prediction}</span>
                  </div>
                  <div className="result-stat-box">
                    <span className="label">실제 결과</span>
                    <span className={`val tag-${answerResult.actualLabel}`}>{answerResult.actualLabel}</span>
                  </div>
                  <div className="result-stat-box">
                    <span className="label">실제 수익률 ({quizData.forecastDays}일간)</span>
                    <span className={`val return-val ${answerResult.returnPercent >= 0 ? 'text-red' : 'text-blue'}`}>
                      {answerResult.returnPercent > 0 ? `+${answerResult.returnPercent}%` : `${answerResult.returnPercent}%`}
                    </span>
                  </div>
                </div>

                <div className="result-action-row">
                  <button className="btn-next-quiz" onClick={startQuiz}>
                    <span>다음 문제 풀기</span>
                    <span className="key-badge-dark">Enter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-hero">
            <div className="hero-icon">📈</div>
            <h2>실전 차트 예측 트레이너</h2>
            <p>
              S&P 500과 NASDAQ-100의 10년치 실제 과거 일봉 캔들을 기반으로<br />
              무작위 구간을 분석하고 다음 20일간의 주가 방향을 예측해보세요.
            </p>
            <div className="hero-features">
              <div className="feature-item">
                <span className="feat-icon">📊</span>
                <strong>다양한 보조지표 지원</strong>
                <p>볼린저 밴드, 이동평균선(5/20/60/120), 거래량, RSI를 자유롭게 켜고 끕니다.</p>
              </div>
              <div className="feature-item">
                <span className="feat-icon">🛡️</span>
                <strong>미래 데이터 원천 차단</strong>
                <p>답안을 제출하기 전에는 어떤 미래 데이터도 브라우저로 전송되지 않습니다.</p>
              </div>
              <div className="feature-item">
                <span className="feat-icon">🎯</span>
                <strong>혼동 행렬 통계 분석</strong>
                <p>나의 예측 성향(상승 편향, 하락 편향 등)을 3x3 행렬로 정밀 분석합니다.</p>
              </div>
            </div>

            <button className="btn-hero-start" onClick={startQuiz} disabled={loading}>
              {loading ? '데이터 로딩 중...' : '지금 훈련 시작하기 (Space or Enter)'}
            </button>
          </div>
        )}
      </main>

      {/* Stats Modal */}
      <StatsModal 
        stats={stats} 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
      />

      {/* Footer / Disclaimer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="disclaimer-badge">
            <span className="disclaimer-icon">⚠️</span>
            <span className="disclaimer-title">면책 조항 (Disclaimer)</span>
          </div>
          <p className="disclaimer-text">
            본 서비스는 금융 투자 권유나 자문 목적이 아니며, 과거 차트 패턴 분석 훈련 및 비상업적 교육/연구 목적으로 제작되었습니다.
            제공되는 데이터는 과거 시세이며 오차나 지연이 있을 수 있습니다. 과거의 수익률이 미래의 성과를 보장하지 않으며, 모든 투자 판단과 결과에 대한 책임은 사용자 본인에게 있습니다.
          </p>
          <div className="footer-credits">
            <span>Powered by <strong>TradingView Lightweight Charts™</strong> (Apache 2.0)</span>
            <span className="dot">•</span>
            <span>Market Data: <strong>Yahoo Finance</strong> (Non-commercial educational use)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
