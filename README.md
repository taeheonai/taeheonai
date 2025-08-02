# TaeheonAI - FastAPI 기반 MSA

FastAPI를 기반으로 한 마이크로서비스 아키텍처(MSA) 플랫폼입니다.

## 🏗️ 아키텍처

```
TaeheonAI/
├── 🌐 gateway/              # API Gateway (Service Discovery + Proxy)
├── 👥 services/             # 마이크로서비스들
│   ├── user-service/        # 사용자 관리 서비스
│   ├── auth-service/        # 인증 서비스
│   └── notification-service/ # 알림 서비스
└── 🎨 frontend/            # Next.js 프론트엔드
```

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
pip install fastapi uvicorn httpx pydantic PyJWT
```

### 2. 서비스 실행

#### 방법 1: PowerShell 스크립트 사용 (권장)
```bash
.\run_services.ps1
```

#### 방법 2: 수동 실행
각 서비스를 별도의 터미널에서 실행:

**터미널 1 - Gateway:**
```bash
cd gateway
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**터미널 2 - User Service:**
```bash
cd services/user-service
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**터미널 3 - Auth Service:**
```bash
cd services/auth-service
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

**터미널 4 - Notification Service:**
```bash
cd services/notification-service
python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

## 📋 서비스 목록

| 서비스 | 포트 | 설명 | URL |
|--------|------|------|-----|
| Gateway | 8000 | API Gateway + Service Discovery | http://localhost:8000 |
| User Service | 8001 | 사용자 관리 | http://localhost:8001 |
| Auth Service | 8002 | 인증/인가 | http://localhost:8002 |
| Notification Service | 8003 | 알림 서비스 | http://localhost:8003 |
| Frontend | 3000 | Next.js 웹 클라이언트 | http://localhost:3000 |

## 🔧 Gateway 기능

### Service Discovery
- 서비스 자동 등록
- 헬스 체크 모니터링
- 서비스 상태 관리

### Proxy Pattern
- 동적 라우팅
- 요청/응답 프록시
- 에러 핸들링

### API 엔드포인트
- `GET /health` - Gateway 헬스 체크
- `GET /services` - 등록된 서비스 목록
- `POST /register` - 새 서비스 등록
- `GET /stats` - 서비스 통계
- `/{service_name}/{path:path}` - 프록시 라우팅

## 🛠️ 기술 스택

### Backend
- **FastAPI** - 고성능 웹 프레임워크
- **Uvicorn** - ASGI 서버
- **Pydantic** - 데이터 검증
- **PyJWT** - JWT 토큰 처리
- **httpx** - 비동기 HTTP 클라이언트

### Frontend
- **Next.js 15** - React 프레임워크
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링

## 📝 API 사용법

### Gateway를 통한 서비스 접근
```bash
# 사용자 목록 조회
curl http://localhost:8000/user-service/users

# 로그인
curl -X POST http://localhost:8000/auth-service/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'

# 알림 생성
curl -X POST http://localhost:8000/notification-service/notifications \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "title": "Test", "message": "Hello!"}'
```

### 직접 서비스 접근
```bash
# User Service
curl http://localhost:8001/users

# Auth Service
curl http://localhost:8002/health

# Notification Service
curl http://localhost:8003/notifications
```

## 🔍 모니터링

### 서비스 상태 확인
```bash
# Gateway 상태
curl http://localhost:8000/health

# 등록된 서비스 목록
curl http://localhost:8000/services

# 서비스 통계
curl http://localhost:8000/stats
```

### 개별 서비스 헬스 체크
```bash
curl http://localhost:8001/health  # User Service
curl http://localhost:8002/health  # Auth Service
curl http://localhost:8003/health  # Notification Service
```

## 🚀 개발 가이드

### 새로운 서비스 추가
1. `services/` 디렉토리에 새 서비스 폴더 생성
2. `main.py` 파일 생성 (FastAPI 앱)
3. `/health` 엔드포인트 추가
4. Gateway의 `INITIAL_SERVICES`에 등록
5. 서비스 실행 및 테스트

### 예시 서비스 구조
```
services/new-service/
├── main.py           # FastAPI 앱
└── requirements.txt  # 의존성
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -an | findstr :800

# 프로세스 종료
taskkill /F /IM python.exe
```

### 서비스 연결 실패
1. 각 서비스가 정상 실행되었는지 확인
2. Gateway 로그 확인
3. 서비스 헬스 체크 확인

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 