# 📈 S&P 500 · NASDAQ-100 차트 트레이너 (Chart Trainer)

과거 실제 지수(S&P 500 `^GSPC`, NASDAQ-100 `^NDX`)의 일봉 캔들 차트를 보고 향후 20거래일간의 주가 방향(`상승`, `횡보`, `하락`)을 예측하고 훈련하는 풀스택 웹 애플리케이션입니다.

---

## ✨ 핵심 기능

1. **실제 시장 데이터 연동 & 자동 캐싱 (`yahoo-finance2` + SQLite)**
   - Yahoo Finance API를 통해 10년 이상의 실제 일봉 캔들 데이터를 자동 수집
   - SQLite DB에 로컬 캐시하여 오프라인 및 고속 무작위 출제 지원
   - 결측치/비정상값 정규화 및 네트워크 에러 시 안전한 백업 Fixture Fallback

2. **철저한 부정행위(Cheating) 방지 설계**
   - 퀴즈 생성(`POST /api/quizzes`) 시 미래 캔들 데이터를 브라우저로 절대 전송하지 않음
   - 답안 제출(`POST /api/quizzes/:id/answer`) 시에만 서버에서 정답 판정 및 후속 캔들을 공개

3. **고성능 TradingView 캔들스틱 차트 (`lightweight-charts` v5)**
   - 모던 다크 핀테크 테마
   - 기준일 이전 노출 캔들과 정답 공개 후 후속 캔들의 시각적 구분 렌더링
   - 툴팁, 십자선(Crosshair), 반응형 자동 크기 조절 지원

4. **혼동 행렬(Confusion Matrix) & 누적 통계 분석**
   - 전체 정답률 및 지수별(S&P 500, NASDAQ-100) 승률 집계
   - 3x3 혼동 행렬(내가 예측한 방향 vs 실제 결과)로 투자 성향 및 편향 분석
   - 최근 훈련 기록 상세 히스토리

5. **쾌속 훈련을 위한 키보드 단축키 & 난이도 조절**
   - **예측 단계**: `1` or `↑` (상승), `2` or `→` (횡보), `3` or `↓` (하락)
   - **결과 단계**: `Enter` or `Space` (다음 문제)
   - **설정**: 노출 기간(30~120일), 예측 기간(10~60일), 횡보 기준 임계값(±1.0% ~ ±5.0%) 커스텀 가능

---

## 🛠️ 기술 스택 및 주요 패키지

### Frontend (`frontend/`)
| 패키지 | 버전 | 역할 |
|---|---|---|
| `react`, `react-dom` | 19.x | 모던 컴포넌트 기반 UI 라이브러리 |
| `typescript` | 6.x | 정적 타입 안정성 보장 |
| `vite` | 8.x | 초고속 HMR 및 빌드 번들러 |
| `lightweight-charts` | 5.2.x | TradingView 공식 고성능 Canvas 금융 차트 라이브러리 |
| `Vanilla CSS` | - | 반응형 다크 핀테크 스타일 디자인 |

### Backend (`backend/`)
| 패키지 | 버전 | 역할 |
|---|---|---|
| `node.js` + `express` | 5.x | RESTful API 서버 프레임워크 |
| `typescript` | 7.x | 백엔드 정적 타입 검사 |
| `tsx` | 4.x | 무설정 고속 TypeScript 런타임 실행기 |
| `yahoo-finance2` | 3.x | Yahoo Finance 공식/비공식 API 클라이언트 |
| `sqlite3` | 6.x | 로컬 파일 기반 경량 영속 DB |
| `zod` | 4.x | 런타임 API 파라미터 유효성 검증 |
| `cors` | 2.x | 로컬 개발 환경 Cross-Origin 통신 허용 |

---

## 🚀 로컬 실행 방법

### 1. 백엔드 실행
```bash
cd backend
npm install
npm run dev
```
> 백엔드 서버는 `http://localhost:4000` 에서 구동됩니다. (포트 변경 가능)

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
> 프론트엔드는 `http://localhost:3100` 에서 구동되며, `/api` 요청은 백엔드로 프록시됩니다.

---

## 🔌 주요 API 명세

- `GET /api/instruments`: 지원 지수 목록 및 데이터 보유 현황 반환
- `POST /api/quizzes`: 무작위 퀴즈 생성 및 노출 구간 캔들만 반환 (`instrument`, `visibleDays`, `forecastDays`, `sidewaysThreshold`)
- `POST /api/quizzes/:id/answer`: 예측값(`prediction`) 제출 및 정오답, 실제 수익률, 후속 캔들 반환
- `GET /api/stats`: 종합 정답률, 지수별 통계, 3x3 혼동 행렬 및 최근 히스토리 반환
- `POST /api/data/refresh`: Yahoo Finance에서 최신 시장 데이터 수동 재동기화
