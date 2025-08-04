# 🚀 Railway 배포 가이드

## 📋 수정된 내용

### 1. **Docker 설정 수정**
- ✅ `docker-compose.yml`: 실제 존재하는 서비스들로 업데이트
- ✅ `gateway/app/Dockerfile`: Railway 환경변수 지원 추가
- ✅ `services/auth-service/Dockerfile`: Railway 환경변수 지원 추가

### 2. **Railway 설정 수정**
- ✅ `gateway/railway.json`: 새로운 Railway 설정 파일 생성
- ✅ `gateway/app/railway.json`: Dockerfile 경로 수정
- ✅ `services/auth-service/railway.json`: PORT 환경변수 사용

### 3. **헬스체크 개선**
- ✅ 모든 서비스에 헬스체크 엔드포인트 확인
- ✅ Docker 헬스체크 설정 추가
- ✅ Railway 헬스체크 타임아웃 설정 (300초)

## 🔧 배포 단계

### 1. **Gateway 배포**
```bash
# Gateway 디렉토리로 이동 (app 폴더의 상위 디렉토리)
cd gateway

# Railway에 배포
railway up
```

### 2. **Auth Service 배포**
```bash
# Auth Service 디렉토리로 이동
cd services/auth-service

# Railway에 배포
railway up
```

### 3. **배포 확인**
```bash
# 환경변수 설정 (Railway URL로 변경)
set GATEWAY_URL=https://your-gateway-url.railway.app
set AUTH_SERVICE_URL=https://your-auth-service-url.railway.app

# 테스트 스크립트 실행
python test_deployment.py
```

## 🐛 문제 해결

### Dockerfile을 찾을 수 없는 경우:

1. **디렉토리 구조 확인**
   ```bash
   # Gateway 디렉토리 구조
   ls gateway/
   ls gateway/app/
   ```

2. **Railway 설정 확인**
   - `gateway/railway.json`에서 `dockerfilePath: "app/Dockerfile"`
   - `gateway/app/railway.json`에서 `dockerfilePath: "./Dockerfile"`

3. **배포 디렉토리 변경**
   ```bash
   # 방법 1: gateway 디렉토리에서 배포
   cd gateway
   railway up
   
   # 방법 2: gateway/app 디렉토리에서 배포
   cd gateway/app
   railway up
   ```

### Healthcheck 실패 시 확인사항:

1. **포트 설정 확인**
   - Gateway: Railway에서 자동 할당된 포트
   - Auth Service: Railway에서 자동 할당된 포트

2. **환경변수 확인**
   - `PORT` 환경변수가 Railway에서 자동 설정되었는지 확인

3. **로그 확인**
   - Railway 대시보드에서 로그 확인
   - 애플리케이션 시작 로그 확인

4. **의존성 확인**
   - `requirements.txt`의 모든 패키지가 설치되었는지 확인

## 📊 모니터링

### 헬스체크 엔드포인트:
- Gateway: `https://your-gateway-url.railway.app/health`
- Auth Service: `https://your-auth-service-url.railway.app/health`

### 루트 엔드포인트:
- Gateway: `https://your-gateway-url.railway.app/`
- Auth Service: `https://your-auth-service-url.railway.app/`

## 🔄 재배포 시 주의사항

1. **순서**: Gateway → Auth Service 순서로 배포
2. **환경변수**: Railway에서 PORT 환경변수 자동 설정 확인
3. **헬스체크**: 배포 후 5분 정도 기다린 후 헬스체크 확인

## 📝 추가 작업

### 다른 서비스 추가 시:
1. `services/` 디렉토리에 새 서비스 생성
2. `Dockerfile` 및 `railway.json` 설정
3. `docker-compose.yml`에 서비스 추가
4. Gateway에서 서비스 등록

### 프론트엔드 연동:
1. `frontend/` 디렉토리의 환경변수 설정
2. Gateway URL을 프론트엔드 환경변수에 설정
3. CORS 설정 확인

## 🔍 문제 해결 체크리스트

### Docker 로컬 테스트:
```bash
# Docker Compose로 로컬 테스트
docker-compose up --build

# 헬스체크 확인
curl http://localhost:8000/health
curl http://localhost:8002/health
```

### Railway 배포 확인:
```bash
# Railway CLI로 배포 상태 확인
railway status
railway logs
```

### 환경변수 확인:
```bash
# Railway 환경변수 확인
railway variables
```

### Dockerfile 경로 문제 해결:
```bash
# 현재 디렉토리에서 Dockerfile 확인
ls -la Dockerfile

# Railway 빌드 컨텍스트 확인
railway build --help
``` 