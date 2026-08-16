# S&P 500 / NASDAQ-100 Chart Trainer

이 프로젝트는 사용자가 S&P 500 또는 NASDAQ-100의 과거 주가 차트를 보고 향후 20일간의 방향을 예측하는 트레이닝 웹 애플리케이션입니다.

## 🛠 사용된 주요 패키지 및 기술 스택

### 프론트엔드 (`frontend/`)
- **React (v18)**: UI 라이브러리
- **TypeScript**: 정적 타입 검사
- **Vite**: 빠르고 모던한 프론트엔드 빌드 툴
- **lightweight-charts**: 캔들스틱 차트 렌더링을 위한 고성능 차트 라이브러리 (TradingView 제공)
- **Vanilla CSS**: 가볍고 직관적인 컴포넌트 스타일링 (TailwindCSS 등 프레임워크 배제)

### 백엔드 (`backend/`)
- **Node.js + Express**: RESTful API 서버
- **TypeScript**: 정적 타입 검사
- **sqlite3**: 문제와 사용자 응답을 임시/영구 보관할 경량 데이터베이스
- **zod**: (예정) 런타임 타입 검사 및 API 요청 검증
- **cors**: 프론트엔드(Vite)와의 로컬 API 통신 허용

## 🚀 로컬 실행 방법

현재 1단계(기반 구성 및 Fixture 연동)가 완료되어 고정된 Mock 데이터로 차트 퀴즈를 테스트해볼 수 있습니다.

### 1. 백엔드 실행
```bash
cd backend
npm install
npm run dev
```
> 서버는 `http://localhost:3000` 에서 실행됩니다.

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
> 클라이언트는 `http://localhost:5173` 에서 실행되며, API 요청은 자동으로 백엔드(3000포트)로 프록시됩니다.
