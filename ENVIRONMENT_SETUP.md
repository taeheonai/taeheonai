# 환경변수 설정 가이드

## 🏗️ **전체 아키텍처**

```
프론트엔드 (Next.js) → Gateway (FastAPI) → 마이크로서비스들
     ↓                    ↓                    ↓
   포트 3000           포트 8080           포트 8001~8008
```

## 🌍 **프론트엔드 환경변수 설정**

### **1. 로컬 개발 환경**
프론트엔드 폴더에 `.env.local` 파일을 생성하고 다음을 추가:

```bash
# 로컬 개발 환경
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Development/Production flags
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
```

### **2. 프로덕션 환경**
Railway 또는 배포 환경에서 다음 환경변수를 설정:

```bash
# 프로덕션 환경
NEXT_PUBLIC_API_URL=https://your-gateway-domain.up.railway.app/api

# Development/Production flags
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🚀 **Gateway 환경변수 설정**

### **1. Railway Variables 설정**

#### **기본 환경변수**
```bash
RAILWAY_ENVIRONMENT=true
PORT=8080
SERVICE_NAME=gateway
```

#### **Database 연결 (Variable Reference 사용)**
1. Railway 대시보드에서 "Add Reference" 클릭
2. Postgres 서비스 선택
3. `DATABASE_URL` 변수 참조 추가

#### **서비스 URL 환경변수들**
```bash
# 마이크로서비스 URL들 (Railway 도메인으로 설정)
AUTH_SERVICE_URL=https://auth-service-xxx.up.railway.app
CHATBOT_SERVICE_URL=https://chatbot-service-xxx.up.railway.app
MATERIALITY_SERVICE_URL=https://materiality-service-xxx.up.railway.app
GRI_SERVICE_URL=https://gri-service-xxx.up.railway.app
GRIREPORT_SERVICE_URL=https://grireport-service-xxx.up.railway.app
TCFD_SERVICE_URL=https://tcfd-service-xxx.up.railway.app
TCFDREPORT_SERVICE_URL=https://tcfdreport-service-xxx.up.railway.app
SURVEY_SERVICE_URL=https://survey-service-xxx.up.railway.app
```

### **2. 환경별 동작**

#### **Railway 환경 (RAILWAY_ENVIRONMENT=true)**
- CORS: 프로덕션 도메인만 허용
- 서비스 연결: Railway 도메인 사용
- 로깅: 프로덕션 레벨

#### **로컬 환경 (RAILWAY_ENVIRONMENT=false 또는 미설정)**
- CORS: localhost 허용
- 서비스 연결: 로컬 포트 사용
- 로깅: 개발 레벨

## 🔗 **API 호출 구조**

환경변수 `NEXT_PUBLIC_API_URL`을 설정하면:

- **로컬 개발**: `http://localhost:8080/api/v1/auth/signup`
- **프로덕션**: `https://your-gateway-domain.up.railway.app/api/v1/auth/signup`

## 📋 **주요 수정사항**

### **1. Gateway ServiceDiscovery**
- 하드코딩된 서비스 URL을 환경변수 기반으로 변경
- Railway 환경 감지 및 로깅 추가

### **2. CORS 설정**
- 환경별로 다른 CORS origins 설정
- Railway vs 로컬 환경 자동 분기

### **3. 프론트엔드 API 호출**
- 모든 API 호출을 `api.ts`의 함수들로 통일
- 하드코딩된 URL 제거

## 🚀 **서비스 실행 순서**

1. **Gateway 실행** (포트 8080)
   ```bash
   cd gateway
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
   ```

2. **Auth Service 실행** (포트 8008)
   ```bash
   cd service/auth-service
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8008
   ```

3. **프론트엔드 실행** (포트 3000)
   ```bash
   cd frontend
   pnpm dev
   ```

## 🧪 **테스트**

환경변수가 올바르게 설정되었는지 확인:

1. 프론트엔드에서 로그인/회원가입 시도
2. Gateway 로그 확인 (포트 8080)
3. Auth Service 로그 확인 (포트 8008)

## ⚠️ **주의사항**

1. **하드코딩 금지**: 코드 어디에도 `http://...` 또는 `https://...`를 직접 작성하지 마세요
2. **단일 소스**: 모든 API 호출은 `NEXT_PUBLIC_API_URL` 환경변수를 통해 이루어집니다
3. **환경별 설정**: 개발/스테이징/프로덕션 환경에 따라 환경변수만 변경하면 됩니다
4. **Railway 환경**: `.env` 파일은 무시되므로 Railway Variables에서 직접 설정해야 합니다
