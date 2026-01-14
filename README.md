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

3. **서비스 설정 (Root Directory)**
   - 생성된 서비스에서 "Settings" 탭으로 이동
   - **Root Directory**: 비워두기 (루트에서 실행) ⭐
   - ⚠️ **중요**: Root Directory를 설정하지 마세요. 루트의 `railway.json` 파일이 자동으로 설정을 적용합니다
   - ⚠️ **Node.js 버전**: Railway가 자동으로 `.nvmrc` 파일을 읽어 Node.js 20을 사용합니다

4. **환경변수 설정**
   - Railway 대시보드 → "Variables" 탭에서 추가:
     ```
     DATABASE_URL=<Railway가 자동 생성한 PostgreSQL URL>
     JWT_SECRET=<최소 16자 이상의 랜덤 문자열>
     CORS_ORIGIN=*
     PORT=4000
     NODE_ENV=production
     ```
   - ⚠️ **중요**: 
     - `DATABASE_URL`은 PostgreSQL 데이터베이스를 추가하면 자동으로 설정됩니다
     - **하나의 서비스만** 사용하세요 (프론트엔드와 백엔드가 통합되어 있습니다)
     - 별도의 "web" 서비스를 만들지 마세요

5. **빌드/실행 명령어 설정**
   - 루트의 `railway.json` 파일이 자동으로 설정을 적용합니다:
     - **Build Command**: `npm install && npm -w apps/api run build`
     - **Start Command**: `npm -w apps/api run prisma:migrate:deploy && npm -w apps/api run start`
   - 수동으로 설정하려면 "Settings" → "Deploy" 섹션에서 위 명령어 입력
   - ⚠️ **참고**: `npm install` 실행 시 `postinstall` 스크립트가 자동으로 `prisma generate`를 실행합니다

6. **Prisma 마이그레이션 실행**
   - Start Command에 `prisma:migrate:deploy`가 포함되어 있어 자동 실행됩니다
   - 배포 로그에서 마이그레이션 실행 여부를 확인할 수 있습니다

7. **⚠️ 중요: 하나의 서비스만 사용**
   - Railway에서 **하나의 서비스만** 생성하세요
   - 프론트엔드와 백엔드가 Express 서버 하나에서 모두 처리됩니다
   - 별도의 "web" 서비스를 만들면 `DATABASE_URL`이 없어서 오류가 발생합니다

### 배포 후 확인

1. **Railway 서비스 확인**
   - Railway 대시보드에서 생성된 도메인 확인 (예: `https://your-app.up.railway.app`)
   - 브라우저에서 `https://your-app.up.railway.app/health` 접속 → `{"ok":true}` 응답 확인
   - 브라우저에서 `https://your-app.up.railway.app` 접속하여 웹사이트 확인
   - 로그인/회원가입 테스트


