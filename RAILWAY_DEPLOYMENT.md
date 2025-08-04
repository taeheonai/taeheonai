# 🚀 Railway 배포 가이드

## 📋 문제 해결: Dockerfile을 찾을 수 없는 경우

### **원인 분석**
Railway에서 "Dockerfile `Dockerfile` does not exist" 오류가 발생하는 이유:
1. 빌드 컨텍스트 문제
2. Dockerfile 경로 설정 오류
3. Railway의 빌드 프로세스 문제

### **해결 방법**

## 🔧 **방법 1: Railway 웹 대시보드 배포**

### **1단계: Railway 웹사이트 접속**
- https://railway.app 접속
- GitHub 계정으로 로그인

### **2단계: Gateway 배포**
1. **"New Project"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. **Repository**: `taeheonai` 선택
4. **Root Directory**: `gateway/app` 입력
5. **Service Name**: `gateway` 입력
6. **Deploy** 클릭

### **3단계: Auth Service 배포**
1. **"Add Service"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. **Repository**: `taeheonai` 선택
4. **Root Directory**: `services/auth-service` 입력
5. **Service Name**: `auth-service` 입력
6. **Deploy** 클릭

## 🔧 **방법 2: Railway CLI 배포**

### **1단계: Railway CLI 설치 및 로그인**
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login
```

### **2단계: Gateway 배포**
```bash
# gateway/app 디렉토리로 이동
cd gateway/app

# 배포
railway up
```

### **3단계: Auth Service 배포**
```bash
# auth-service 디렉토리로 이동
cd services/auth-service

# 배포
railway up
```

## 🔍 **문제 해결 체크리스트**

### **Dockerfile 경로 확인**
```bash
# Gateway 디렉토리 구조
ls gateway/app/
# Dockerfile이 있어야 함

# Auth Service 디렉토리 구조
ls services/auth-service/
# Dockerfile이 있어야 함
```

### **Railway 설정 파일 확인**
- `gateway/app/railway.json`: `dockerfilePath: "Dockerfile"`
- `services/auth-service/railway.json`: `dockerfilePath: "Dockerfile"`

### **환경변수 확인**
- Railway에서 `PORT` 환경변수가 자동 설정되는지 확인
- `$PORT` 환경변수가 Dockerfile에서 올바르게 사용되는지 확인

## 📊 **배포 후 확인사항**

### **헬스체크 확인**
```bash
# Gateway 헬스체크
curl https://your-gateway-url.railway.app/health

# Auth Service 헬스체크
curl https://your-auth-service-url.railway.app/health
```

### **로그 확인**
- Railway 대시보드에서 로그 확인
- 애플리케이션 시작 로그 확인
- 오류 로그 확인

## 🐛 **자주 발생하는 문제**

### **1. Dockerfile을 찾을 수 없는 경우**
- **해결**: Root Directory를 정확히 설정
  - Gateway: `gateway/app`
  - Auth Service: `services/auth-service`

### **2. 포트 바인딩 오류**
- **해결**: Railway에서 자동 할당된 포트 사용
- `$PORT` 환경변수 사용 확인

### **3. 의존성 설치 오류**
- **해결**: `requirements.txt` 파일 확인
- Python 버전 호환성 확인

## 📝 **배포 성공 후 다음 단계**

### **1. 환경변수 설정**
```bash
# Railway URL 환경변수 설정
set GATEWAY_URL=https://your-gateway-url.railway.app
set AUTH_SERVICE_URL=https://your-auth-service-url.railway.app
```

### **2. 배포 테스트**
```bash
# 테스트 스크립트 실행
python test_deployment.py
```

### **3. 프론트엔드 연동**
- Gateway URL을 프론트엔드 환경변수에 설정
- CORS 설정 확인

## 🎯 **성공 지표**

✅ **배포 성공 시 확인사항:**
- Railway 대시보드에서 "Deployed" 상태
- 헬스체크 엔드포인트 응답 (200 OK)
- 애플리케이션 로그에서 정상 시작 메시지
- 포트 바인딩 성공 