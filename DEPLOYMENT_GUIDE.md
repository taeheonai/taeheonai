# 🚀 Railway 배포 가이드

## 📋 수정된 내용

### 1. **Docker 설정 수정**
- ✅ `docker-compose.yml`: 실제 존재하는 서비스들로 업데이트
- ✅ `gateway/app/Dockerfile`: Railway 환경변수 지원 추가
- ✅ `services/auth-service/Dockerfile`: Railway 환경변수 지원 추가

### 2. **Railway 설정 수정**
- ✅ `gateway/app/railway.json`: Dockerfile 경로 수정 및 PORT 환경변수 사용
- ✅ `services/auth-service/railway.json`: PORT 환경변수 사용

### 3. **헬스체크 개선**
- ✅ 모든 서비스에 헬스체크 엔드포인트 확인
- ✅ Docker 헬스체크 설정 추가
- ✅ Railway 헬스체크 타임아웃 설정 (300초)

## 🔧 배포 단계

### 1. **Gateway 배포**
```bash
# Gateway 디렉토리로 이동
cd gateway/app

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
# 테스트 스크립트 실행
python test_deployment.py
```

## 🐛 문제 해결

### Healthcheck 실패 시 확인사항:

1. **포트 설정 확인**
   - Gateway: 8000번 포트
   - Auth Service: 8002번 포트

2. **환경변수 확인**
   - `PORT` 환경변수가 올바르게 설정되었는지 확인

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