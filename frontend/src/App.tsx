import React, { useState, useEffect } from 'react';
import { Chart, CandleData } from './Chart';
import './App.css';

interface Instrument {
  id: string;
  symbol: string;
  name: string;
}

function App() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('sp500');
  const [quizData, setQuizData] = useState<any>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/instruments')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setInstruments(data.instruments);
        }
      })
      .catch(err => console.error('Failed to fetch instruments', err));
  }, []);

  const startQuiz = async () => {
    setLoading(true);
    setAnswerResult(null);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument: selectedInstrument, visibleDays: 60, forecastDays: 20 })
      });
      const data = await res.json();
      setQuizData(data);
      
      const formattedCandles = data.visibleCandles.map((c: any) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));
      setCandles(formattedCandles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (prediction: string) => {
    if (!quizData) return;
    try {
      const res = await fetch(`/api/quizzes/${quizData.quizId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction })
      });
      const data = await res.json();
      setAnswerResult(data);
      
      // Update chart with revealed candles
      if (data.revealedCandles) {
        const revealed = data.revealedCandles.map((c: any) => ({
          time: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
        // For now just appending, in actual implementation we might want to highlight them
        setCandles(prev => [...prev, ...revealed]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Chart Trainer</h1>
        <div className="controls">
          <select 
            value={selectedInstrument} 
            onChange={e => setSelectedInstrument(e.target.value)}
            disabled={loading}
          >
            {instruments.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <button onClick={startQuiz} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {quizData ? (
          <div className="quiz-area">
            <div className="quiz-header">
              <h2>Predict the next 20 days!</h2>
              <p>Cutoff Date: <strong>{quizData.cutoffDate}</strong></p>
            </div>
            
            <div className="chart-container">
              {candles.length > 0 && <Chart data={candles} />}
            </div>

            {!answerResult ? (
              <div className="prediction-actions">
                <button onClick={() => submitAnswer('상승')} className="btn-up">상승 (Up)</button>
                <button onClick={() => submitAnswer('횡보')} className="btn-sideways">횡보 (Sideways)</button>
                <button onClick={() => submitAnswer('하락')} className="btn-down">하락 (Down)</button>
              </div>
            ) : (
              <div className="result-panel">
                <h3>Result: {answerResult.isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h3>
                <p>Your prediction: <strong>{answerResult.prediction}</strong></p>
                <p>Actual movement: <strong>{answerResult.actualLabel}</strong> ({answerResult.returnPercent.toFixed(2)}%)</p>
                <button onClick={startQuiz} className="btn-primary mt-4">Next Quiz</button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>Select an instrument and click Start Quiz to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
