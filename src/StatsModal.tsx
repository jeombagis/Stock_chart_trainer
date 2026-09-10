import type React from 'react';

export interface StatsData {
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

interface StatsModalProps {
  stats: StatsData | null;
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, isOpen, onClose, onReset }) => {
  if (!isOpen || !stats) return null;

  const matrix = stats.confusionMatrix || {
    상승: { 상승: 0, 횡보: 0, 하락: 0 },
    횡보: { 상승: 0, 횡보: 0, 하락: 0 },
    하락: { 상승: 0, 횡보: 0, 하락: 0 },
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 누적 훈련 통계 & 혼동 행렬</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Summary Cards */}
          <div className="stats-summary-grid">
            <div className="stat-card">
              <span className="stat-label">총 훈련 횟수</span>
              <span className="stat-value">{stats.total}회</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">정답 횟수</span>
              <span className="stat-value highlight">{stats.correct}회</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">종합 정답률</span>
              <span className="stat-value success">{stats.accuracy}%</span>
            </div>
          </div>

          {/* By Instrument */}
          <div className="section-title">지수별 성적</div>
          <div className="instrument-stats-row">
            <div className="instrument-card">
              <div className="inst-name">🇺🇸 S&P 500</div>
              <div className="inst-acc">{stats.byInstrument.sp500?.accuracy || 0}%</div>
              <div className="inst-detail">
                {stats.byInstrument.sp500?.correct || 0} / {stats.byInstrument.sp500?.total || 0} 정답
              </div>
            </div>
            <div className="instrument-card">
              <div className="inst-name">🚀 NASDAQ-100</div>
              <div className="inst-acc">{stats.byInstrument.nasdaq100?.accuracy || 0}%</div>
              <div className="inst-detail">
                {stats.byInstrument.nasdaq100?.correct || 0} / {stats.byInstrument.nasdaq100?.total || 0} 정답
              </div>
            </div>
          </div>

          {/* Confusion Matrix (3x3) */}
          <div className="section-title">
            <span>3x3 혼동 행렬 (Confusion Matrix)</span>
            <span className="subtitle">행: 실제 결과 / 열: 내가 예측한 방향</span>
          </div>
          <div className="matrix-wrapper">
            <table className="confusion-table">
              <thead>
                <tr>
                  <th className="corner-th">실제 \ 예측</th>
                  <th>상승 (Pred)</th>
                  <th>횡보 (Pred)</th>
                  <th>하락 (Pred)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="row-header">실제 상승</th>
                  <td className="diagonal-cell">{matrix.상승?.상승 || 0}</td>
                  <td>{matrix.상승?.횡보 || 0}</td>
                  <td>{matrix.상승?.하락 || 0}</td>
                </tr>
                <tr>
                  <th className="row-header">실제 횡보</th>
                  <td>{matrix.횡보?.상승 || 0}</td>
                  <td className="diagonal-cell">{matrix.횡보?.횡보 || 0}</td>
                  <td>{matrix.횡보?.하락 || 0}</td>
                </tr>
                <tr>
                  <th className="row-header">실제 하락</th>
                  <td>{matrix.하락?.상승 || 0}</td>
                  <td>{matrix.하락?.횡보 || 0}</td>
                  <td className="diagonal-cell">{matrix.하락?.하락 || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Recent History */}
          <div className="section-title">최근 훈련 기록</div>
          <div className="history-table-wrapper">
            {stats.recentHistory && stats.recentHistory.length > 0 ? (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>기준일</th>
                    <th>지수</th>
                    <th>내 예측</th>
                    <th>실제 결과</th>
                    <th>수익률</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentHistory.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.cutoffDate}</td>
                      <td>{item.instrument === 'sp500' ? 'S&P 500' : 'NASDAQ-100'}</td>
                      <td><span className={`tag tag-${item.prediction}`}>{item.prediction}</span></td>
                      <td><span className={`tag tag-${item.actualLabel}`}>{item.actualLabel}</span></td>
                      <td className={item.returnPercent >= 0 ? 'text-red' : 'text-blue'}>
                        {item.returnPercent > 0 ? `+${item.returnPercent}%` : `${item.returnPercent}%`}
                      </td>
                      <td>
                        <span className={`result-tag ${item.isCorrect ? 'tag-correct' : 'tag-wrong'}`}>
                          {item.isCorrect ? '정답' : '오답'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-history">아직 훈련 기록이 없습니다. 문제를 풀어보세요!</div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          {onReset ? (
            <button 
              className="btn-secondary" 
              onClick={onReset}
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              🗑️ 기록 초기화
            </button>
          ) : <div />}
          <button className="btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};
