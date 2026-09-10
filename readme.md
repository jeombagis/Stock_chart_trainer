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

| 패키지 | 버전 | 역할 |
|---|---|---|
| `react`, `react-dom` | 19.x | 모던 컴포넌트 기반 UI 라이브러리 |
| `typescript` | 6.x | 정적 타입 안정성 보장 |
| `vite` | 8.x | 초고속 HMR 및 빌드 번들러 |
| `lightweight-charts` | 5.2.x | TradingView 공식 고성능 Canvas 금융 차트 라이브러리 |
| `yahoo-finance2` | 4.x | Yahoo Finance 시세 수집 라이브러리 (데이터 동기화 스크립트 전용) |
| `tsx` | 4.x | TypeScript CLI 스크립트 고속 실행기 |
| `Vanilla CSS` | - | 반응형 다크 핀테크 스타일 디자인 |

---

## 🚀 로컬 실행 & 빌드 방법

### 1. 개발 서버 시작 (0초 딜레이 순수 프론트엔드)
```bash
npm install
npm run dev
```
> 애플리케이션이 `http://localhost:3100` 에서 즉시 구동됩니다.
> 별도 백엔드 서버 없이 브라우저 로컬 엔진으로 동작하므로 네트워크 지연(0ms) 없이 즉시 훈련할 수 있습니다.

### 2. 프로덕션 빌드 (Cloudflare Pages 배포용)
```bash
npm run build
```
> `dist/` 폴더에 정적 번들이 생성되며, Cloudflare Pages에 바로 배포할 수 있습니다.

### 3. 차트 데이터 최신화 (Yahoo Finance 실시간 동기화)
```bash
npm run sync-data
```
> Yahoo Finance로부터 2015년 이후 최신 일봉 캔들 데이터를 자동으로 긁어와 `src/data/seedCandles.json`을 갱신합니다.
> 데이터 갱신 후 `npm run build`를 실행하거나 Git에 커밋하면 배포 사이트에도 최신 데이터가 반영됩니다.
---

## 🏛️ 아키텍처 구조 (Zero-Server Architecture)

- **클라이언트 퀴즈 엔진 (`src/services/quizService.ts`)**: 브라우저 로컬 메모리에서 10년 치 일봉 중 무작위 구간을 0ms 만에 추출하고 답안을 판정합니다.
- **로컬 스토리지 통계 (`src/services/statsStorage.ts`)**: `localStorage`를 사용하여 사용자의 누적 훈련 전적, 3x3 혼동 행렬, 최근 15개 훈련 상세 기록을 영구 보존합니다.
- **시장 데이터 동기화 도구 (`scripts/sync-data.ts`)**: Yahoo Finance API를 통해 S&P 500(`^GSPC`) 및 NASDAQ-100(`^NDX`)의 최신 일봉 데이터를 수집하고 `src/data/seedCandles.json`으로 스냅샷을 만듭니다.
- **클라우드플레어 페이지스 배포**: 서버리스 정적 웹 호스팅으로 영구 무료($0) 및 무제한 대역폭으로 운영됩니다.

---

## ⚖️ 면책 조항 및 라이선스 고지 (Disclaimer & Licensing)

### 면책 조항 (Disclaimer)
- 본 애플리케이션은 금융 투자 권유, 종목 추천, 또는 투자 자문 목적이 아니며, 과거 차트 패턴 분석 훈련 및 **비상업적 교육·연구 목적**으로 제작되었습니다.
- 제공되는 데이터는 과거 시세 데이터이며 수집 시점 및 통신 상태에 따라 지연이나 오차가 발생할 수 있습니다.
- 과거의 시세 패턴이나 성과가 미래의 투자 수익을 보장하지 않으며, 본 서비스를 참고하여 행한 모든 투자 결정 및 그로 인한 손익의 책임은 투자자 본인에게 있습니다.

### 데이터 및 오픈소스 라이선스
- **차트 라이브러리**: [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache License 2.0)
- **시장 데이터 출처**: Yahoo Finance Historical Data (비상업적 교육 및 연구 목적 인용)
- **지수 상표권**: S&P 500은 *Standard & Poor's Financial Services LLC*, NASDAQ-100은 *Nasdaq, Inc.*의 등록 상표입니다.
- **오픈소스 라이선스**: 본 프로젝트의 소스코드는 MIT License를 따릅니다.

