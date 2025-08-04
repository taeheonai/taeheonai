# TaeheonAI API Gateway

마이크로서비스 아키텍처를 위한 API Gateway입니다.

## 🚀 Railway 배포

### 1. GitHub 저장소 생성
```bash
# Gateway 전용 저장소 생성
git init
git add .
git commit -m "Initial commit: API Gateway"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taeheonai-gateway.git
git push -u origin main
```

### 2. Railway 프로젝트 생성
1. [Railway.app](https://railway.app) 접속
2. "New Project" → "Deploy from GitHub repo"
3. `taeheonai-gateway` 저장소 선택
4. 배포 설정 확인

### 3. 환경변수 설정
Railway 대시보드에서 다음 환경변수 설정:

```
# 서비스 URL들 (배포 후 업데이트)
USER_SERVICE_URL=https://your-user-service.railway.app
AUTH_SERVICE_URL=https://your-auth-service.railway.app
NOTIFICATION_SERVICE_URL=https://your-notification-service.railway.app
```

## 📁 프로젝트 구조

```
gateway/
├── app/
│   ├── main.py              # FastAPI 애플리케이션
│   ├── models.py            # Pydantic 모델
│   ├── proxy.py             # 프록시 서비스
│   ├── service_discovery.py # 서비스 디스커버리
│   ├── requirements.txt     # Python 의존성
│   └── Dockerfile          # Docker 설정
├── railway.json            # Railway 배포 설정
└── README.md              # 이 파일
```

## 🔧 개발 환경

### 로컬 실행
```bash
cd app
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker 실행
```bash
docker build -t taeheonai-gateway .
docker run -p 8000:8000 taeheonai-gateway
```

## 📡 API 엔드포인트

- `GET /` - Gateway 정보
- `GET /health` - 헬스 체크
- `GET /services` - 등록된 서비스 목록
- `POST /register` - 서비스 등록
- `DELETE /unregister/{service_name}` - 서비스 등록 해제
- `GET /stats` - 서비스 통계

## 🔄 프록시 라우팅

모든 서비스 요청은 다음 패턴으로 라우팅됩니다:
- `/{service_name}/{path}` → 해당 서비스로 프록시

예시:
- `GET /user-service/users` → User Service의 `/users`
- `POST /auth-service/login` → Auth Service의 `/login` 