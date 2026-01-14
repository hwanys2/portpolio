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

## 배포 가이드

### Railway (백엔드 API)

1. **Railway 프로젝트 생성**
   - [Railway](https://railway.app)에 로그인 후 새 프로젝트 생성
   - GitHub 레포지토리 연결: `https://github.com/hwanys2/portpolio.git`

2. **PostgreSQL 데이터베이스 추가**
   - Railway 대시보드에서 "New" → "Database" → "PostgreSQL" 선택
   - 생성된 `DATABASE_URL` 환경변수 자동 설정됨

3. **서비스 설정 (Root Directory 지정)**
   - 생성된 서비스에서 "Settings" 탭으로 이동
   - **Root Directory**: `apps/api` 설정 ⭐
   - 이렇게 하면 Railway가 `apps/api` 폴더를 루트로 인식합니다

4. **환경변수 설정**
   - Railway 대시보드 → "Variables" 탭에서 추가:
     ```
     DATABASE_URL=<Railway가 자동 생성한 PostgreSQL URL>
     JWT_SECRET=<최소 16자 이상의 랜덤 문자열>
     CORS_ORIGIN=https://your-vercel-app.vercel.app
     PORT=4000
     ```

5. **빌드/실행 명령어 설정**
   - "Settings" → "Deploy" 섹션에서:
     - **Build Command**: `npm install && npm -w apps/api run build`
     - **Start Command**: `npm -w apps/api run start`
   - 또는 `apps/api/package.json`의 스크립트를 사용:
     - Build: `npm install && npm run build` (Root Directory가 `apps/api`이므로)
     - Start: `npm run start`

6. **Prisma 마이그레이션 실행**
   - Railway 대시보드 → "Deployments" → 최신 배포의 "View Logs"에서:
     - 또는 "Settings" → "Deploy" → "Deploy Command"에 추가:
       ```
       npm install && npm run prisma:generate && npm run prisma:migrate && npm run build
       ```

### Vercel (프론트엔드 Web)

1. **Vercel 프로젝트 생성**
   - [Vercel](https://vercel.com)에 로그인 후 새 프로젝트 생성
   - GitHub 레포지토리 연결: `https://github.com/hwanys2/portpolio.git`

2. **프로젝트 설정 (Root Directory 지정)**
   - "Configure Project" 화면에서:
     - **Root Directory**: `apps/web` 설정 ⭐
     - "Edit" 클릭 → `apps/web` 입력 → "Continue"
   - 또는 배포 후 "Settings" → "General" → "Root Directory"에서 변경 가능

3. **빌드 설정**
   - Vercel이 자동으로 감지하지만, 명시적으로 설정하려면:
     - "Settings" → "General" → "Build & Development Settings":
       - **Framework Preset**: Next.js
       - **Root Directory**: `apps/web`
       - **Build Command**: `npm run build` (Root Directory가 `apps/web`이므로 자동)
       - **Output Directory**: `.next` (기본값)
       - **Install Command**: `npm install` (루트에서 실행되므로 `npm -w apps/web install` 필요 없음)

4. **환경변수 설정**
   - "Settings" → "Environment Variables"에서 추가:
     ```
     NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
     ```
   - ⚠️ **주의**: Railway API URL은 배포 후 실제 URL로 변경해야 합니다.

5. **배포**
   - GitHub에 푸시하면 자동 배포됩니다.
   - 또는 Vercel 대시보드에서 "Deployments" → "Redeploy" 클릭

### 배포 후 확인

1. **Railway API 확인**
   - Railway 대시보드에서 생성된 도메인 확인 (예: `https://your-api.up.railway.app`)
   - 브라우저에서 `https://your-api.up.railway.app/health` 접속 → `{"status":"ok"}` 응답 확인

2. **Vercel 프론트엔드 확인**
   - Vercel 대시보드에서 생성된 도메인 확인
   - 브라우저에서 접속하여 로그인/회원가입 테스트

3. **CORS 설정 업데이트**
   - Railway 환경변수 `CORS_ORIGIN`을 Vercel 도메인으로 업데이트
   - Railway 서비스 재배포 필요


