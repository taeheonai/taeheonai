# TaeheonAI - FastAPI 기반 MSA

FastAPI를 기반으로 한 마이크로서비스 아키텍처(MSA) 플랫폼입니다.

## 🏗️ 아키텍처

```
TaeheonAI/
├── 🌐 gateway/              # API Gateway (인증/프록시/CORS)
├── 🛠️ service/             # 마이크로서비스
│   ├── auth-service/        # 인증/회원가입 (8008)
│   ├── chatbot-service/     # 챗봇 (8001)
│   ├── corporation-service/ # 기업 정보 (8009)
│   ├── gri-service/        # GRI 표준 (8003)
│   ├── report-service/     # GRI 보고서 (8004)
│   ├── llm-service/        # LLM 윤문 (8005)
│   ├── materiality-service/# 중대성 평가 (8002)
│   └── survey-service/     # 설문 (8007)
└── 🎨 frontend/           # Next.js 프론트엔드 (3000)
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 각 서비스의 .env 파일 설정
cp gateway/.env.example gateway/.env
cp service/auth-service/.env.example service/auth-service/.env
# ... 기타 서비스도 동일하게 설정
```

### 2. 서비스 실행

```bash
# Docker Compose로 전체 서비스 실행
docker-compose up -d

# 또는 개별 서비스 실행
docker-compose up -d gateway auth-service corporation-service
```

## 📋 서비스 목록

| 서비스 | 포트 | 설명 | 엔드포인트 |
|--------|------|------|------------|
| Gateway | 8080 | API Gateway + 인증 | /api/v1/* |
| Auth Service | 8008 | 인증/회원가입 | /v1/auth/* |
| Chatbot Service | 8001 | 챗봇 | /v1/chatbot/* |
| Corporation Service | 8009 | 기업 정보 | /v1/corporation/* |
| GRI Service | 8003 | GRI 표준 | /v1/gri/* |
| Report Service | 8004 | GRI 보고서 | /v1/report/* |
| LLM Service | 8005 | LLM 윤문 | /v1/llm/* |
| Materiality Service | 8002 | 중대성 평가 | /v1/materiality/* |
| Survey Service | 8007 | 설문 | /v1/survey/* |
| Frontend | 3000 | Next.js 웹 | / |

## 🔧 Gateway 기능

### 인증 및 보안
- 클라이언트 인증 (X-Client-Key)
- CORS 설정
- 레이트리밋 (Redis)

### 프록시 기능
- 트레이스 전파 (X-Request-Id)
- 타임아웃/재시도
- 에러 핸들링

### API 엔드포인트
- `GET /api/v1/health` - Gateway 헬스체크
- `POST /api/v1/auth/*` - 인증 서비스
- `POST /api/v1/gri/*` - GRI 서비스
- `POST /api/v1/llm/*` - LLM 서비스

## 🛠️ 기술 스택

### Backend
- **FastAPI** - 고성능 웹 프레임워크
- **Pydantic** - 데이터 검증
- **SQLAlchemy** - ORM
- **LangChain** - LLM 통합
- **httpx** - 비동기 HTTP 클라이언트

### Frontend
- **Next.js** - React 프레임워크
- **TypeScript** - 타입 안전성
- **TailwindCSS** - 스타일링

### Infrastructure
- **Docker** - 컨테이너화
- **Railway** - 클라우드 배포
- **PostgreSQL** - 데이터베이스
- **Redis** - 캐싱/레이트리밋

## 📝 API 사용 예시

### Gateway를 통한 서비스 접근
```bash
# 회원가입
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-client-key" \
  -d '{
    "corporation_id": 2506,
    "companyname": "한온시스템",
    "auth_id": "user123",
    "auth_pw": "pass123"
  }'

# GRI 답변 윤문
curl -X POST http://localhost:8080/api/v1/polish \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-client-key" \
  -d '{
    "session_key": "session_123",
    "gri_index": "201-1",
    "style": "중립",
    "audience": "실무자"
  }'
```

## 🔍 모니터링

### 서비스 상태 확인
```bash
# Gateway 상태
curl http://localhost:8080/api/v1/health

# 개별 서비스 상태
curl http://localhost:8008/health  # Auth Service
curl http://localhost:8005/health  # LLM Service
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -an | findstr :800

# Docker 컨테이너 재시작
docker-compose restart auth-service
```

### 서비스 연결 실패
1. Docker 컨테이너 상태 확인: `docker ps`
2. 서비스 로그 확인: `docker logs esg_mate-auth-service-1`
3. 네트워크 연결 확인: `docker network ls`

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.