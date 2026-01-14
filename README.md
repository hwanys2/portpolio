# Portfolio Weight Tracker (MVP)

목표 비중(타깃)으로 포트폴리오를 만들고, 시간이 지나 가격이 변했을 때 **현재 평가금액/현재 비중을 자동 계산**해서 보여주며, 종목별 **허용오차(±%)**를 벗어나면 시각적 경고를 주는 앱입니다.

## 구성

- **Frontend**: Next.js (React) — `apps/web` (Vercel 배포 대상)
- **Backend**: Express + Prisma — `apps/api` (Railway 배포 대상)
- **외부 데이터**: `yahoo-finance2` 기반 종목 검색/현재가 조회

## 로컬 실행

### 1) 의존성 설치

```bash
cd /Users/hwanys2/Coding/portfolio
npm install
```

### 2) 백엔드 환경변수 설정

`apps/api`는 환경변수가 필요합니다 (예: Railway Postgres).

- **DATABASE_URL**: Postgres 연결 문자열
- **JWT_SECRET**: 최소 16자 이상 권장
- **CORS_ORIGIN**: 로컬 프론트 주소(기본 `http://localhost:3000`)
- **PORT**: 기본 4000

예시:

```bash
cd /Users/hwanys2/Coding/portfolio/apps/api
cat > .env <<'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="dev_secret_change_me_1234"
CORS_ORIGIN="http://localhost:3000"
PORT=4000
EOF
```

### 3) Prisma 마이그레이션/클라이언트 생성

```bash
cd /Users/hwanys2/Coding/portfolio
npm -w apps/api run prisma:generate
npm -w apps/api run prisma:migrate
```

### 4) 실행

```bash
cd /Users/hwanys2/Coding/portfolio
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/health`

## API 개요

- **Auth**
  - `POST /auth/register` { email, password } → { token, user }
  - `POST /auth/login` { email, password } → { token, user }
  - `GET /auth/me` (Bearer) → { user }
- **Assets**
  - `GET /assets/search?q=...` (Bearer)
  - `GET /assets/quote?symbol=...` (Bearer)
- **Portfolios**
  - `POST /portfolios` (Bearer)  
    생성 시점에 각 종목 **현재가(entry_price)**를 조회하고,
    \(initial\_quantity = (총투자금 \* 목표비중) / entry\_price\) 로 자동 계산해 저장합니다.
  - `GET /portfolios` (Bearer)
  - `GET /portfolios/:id` (Bearer)
  - `POST /portfolios/:id/refresh` (Bearer) → 최신가로 현재 비중/차이/경고 계산 반환
  - `PATCH /portfolios/:id/items/:itemId` (Bearer) → current_quantity, tolerance 업데이트

## 배포(요약)

### Railway (API)

- 환경변수: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- 빌드/실행:
  - build: `npm -w apps/api run build`
  - start: `npm -w apps/api run start`

### Vercel (Web)

- 환경변수:
  - `NEXT_PUBLIC_API_URL`: Railway API URL (예: `https://your-api.up.railway.app`)
- build:
  - `npm -w apps/web run build`


