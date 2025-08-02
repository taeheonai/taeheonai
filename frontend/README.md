# TaeheonAI

Next.js 기반의 PWA 애플리케이션으로 TypeScript, React, Zustand, Axios를 사용하여 구축되었습니다. **MSA(Microservice Architecture)** 구조로 설계되어 API Gateway를 통해 서비스 디스커버리와 프록시 패턴을 구현했습니다.

## 🚀 기술 스택

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Package Manager**: pnpm
- **PWA**: next-pwa

### Backend (MSA)
- **API Gateway**: FastAPI
- **Microservices**: FastAPI (User, Auth, Notification Services)
- **Service Discovery**: Custom Implementation
- **Proxy Pattern**: Dynamic Routing
- **Containerization**: Docker

### DevOps
- **CI/CD**: GitHub Actions
- **Container Orchestration**: Docker Compose
- **Cache**: Redis

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │  Microservices  │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 8001-3  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Cache)       │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 📋 기능

### Frontend (PWA)
- ✅ **PWA (Progressive Web App)**: 홈 화면 설치, 오프라인 지원
- ✅ **상태 관리**: Zustand를 사용한 간단한 상태 관리
- ✅ **API 통신**: Axios를 사용한 HTTP 클라이언트
- ✅ **반응형 디자인**: 모바일 및 데스크톱 최적화
- ✅ **다크모드**: 자동 테마 전환 지원

### Backend (MSA)
- ✅ **API Gateway**: 서비스 디스커버리 및 프록시 라우팅
- ✅ **Service Discovery**: 동적 서비스 등록/해제
- ✅ **Health Check**: 자동 서비스 상태 모니터링
- ✅ **Load Balancing**: 프록시 패턴을 통한 요청 분산
- ✅ **Microservices**: 사용자, 인증, 알림 서비스

## 🛠️ 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- Python 3.11+
- pnpm 8+
- Docker & Docker Compose

### 로컬 개발

1. **저장소 클론**
```bash
git clone <repository-url>
cd taeheonai
```

2. **Frontend 의존성 설치**
```bash
pnpm install
```

3. **Backend 의존성 설치**
```bash
cd gateway
pip install -r requirements.txt
cd ../services/user-service
pip install -r requirements.txt
cd ../auth-service
pip install -r requirements.txt
cd ../notification-service
pip install -r requirements.txt
cd ../..
```

4. **환경 변수 설정**
```bash
cp env.example .env.local
# .env.local 파일을 편집하여 필요한 환경 변수를 설정하세요
```

5. **개발 서버 실행**

**Frontend만 실행:**
```bash
pnpm dev
```

**전체 MSA 환경 실행:**
```bash
docker-compose up
```

6. **브라우저에서 확인**
```
Frontend: http://localhost:3000
API Gateway: http://localhost:8000
User Service: http://localhost:8001
Auth Service: http://localhost:8002
Notification Service: http://localhost:8003
```

### Docker를 사용한 개발

```bash
# 전체 MSA 환경
docker-compose up

# 특정 서비스만 실행
docker-compose up gateway
docker-compose up frontend-dev
```

## 🚀 배포

### CI/CD 파이프라인

이 프로젝트는 GitHub Actions를 사용하여 자동화된 CI/CD 파이프라인을 구축했습니다:

- **브랜치 전략**:
  - `main`: 프로덕션 배포
  - `develop`: 개발 환경 배포

- **자동화된 단계**:
  1. 코드 체크아웃
  2. 의존성 설치
  3. 린팅 및 타입 체크
  4. 애플리케이션 빌드
  5. Docker 이미지 빌드 및 푸시
  6. 환경별 배포

### 수동 배포

```bash
# 개발 환경 배포
./scripts/deploy.sh dev

# 프로덕션 환경 배포
./scripts/deploy.sh prod
```

## 📁 프로젝트 구조

```
taeheonai/
├── .github/workflows/          # GitHub Actions 워크플로우
├── src/                        # Next.js Frontend
│   ├── app/                   # Next.js App Router
│   ├── store/                 # Zustand 스토어
│   └── lib/                   # 유틸리티 및 설정
├── gateway/                    # API Gateway
│   ├── main.py               # FastAPI Gateway
│   ├── models.py             # Pydantic 모델
│   ├── service_discovery.py  # 서비스 디스커버리
│   ├── proxy.py              # 프록시 서비스
│   ├── requirements.txt      # Python 의존성
│   └── Dockerfile           # Gateway Docker 설정
├── services/                  # Microservices
│   ├── user-service/         # 사용자 관리 서비스
│   ├── auth-service/         # 인증 서비스
│   └── notification-service/ # 알림 서비스
├── public/                   # 정적 파일
├── scripts/                  # 배포 스크립트
├── Dockerfile               # Frontend Docker 설정
├── Dockerfile.dev           # 개발용 Docker 설정
├── docker-compose.yml       # 전체 MSA Docker 설정
└── next.config.ts           # Next.js 설정
```

## 🔧 API Gateway 엔드포인트

### Gateway 관리
- `GET /` - Gateway 정보
- `GET /health` - Gateway 헬스 체크
- `GET /services` - 등록된 서비스 목록
- `POST /register` - 새 서비스 등록
- `DELETE /unregister/{service_name}` - 서비스 등록 해제
- `GET /stats` - 서비스 통계

### 서비스 프록시
- `GET /{service_name}/{path}` - 서비스 요청 프록시
- `POST /{service_name}/{path}` - 서비스 요청 프록시
- `PUT /{service_name}/{path}` - 서비스 요청 프록시
- `DELETE /{service_name}/{path}` - 서비스 요청 프록시

### 예시 사용법
```bash
# 사용자 서비스 호출
curl http://localhost:8000/user-service/users

# 인증 서비스 호출
curl http://localhost:8000/auth-service/login

# 알림 서비스 호출
curl http://localhost:8000/notification-service/notifications
```

## 🔧 스크립트

```bash
# Frontend 개발 서버 실행
pnpm dev

# Frontend 프로덕션 빌드
pnpm build

# Frontend 프로덕션 서버 실행
pnpm start

# Frontend 린팅
pnpm lint

# Frontend 타입 체크
pnpm type-check

# CI 테스트
pnpm test:ci

# Gateway 실행
cd gateway
uvicorn main:app --host 0.0.0.0 --port 8000

# 마이크로서비스 실행
cd services/user-service
uvicorn main:app --host 0.0.0.0 --port 8001
```

## 🌐 환경 변수

필요한 환경 변수들을 `env.example` 파일에서 확인하고 `.env.local`에 설정하세요:

- `NEXT_PUBLIC_API_URL`: API Gateway URL
- `NODE_ENV`: 실행 환경 (development/production)
- `NEXT_PUBLIC_ENVIRONMENT`: 프론트엔드 환경 설정

## 📱 PWA 기능

- 홈 화면에 앱 추가 가능
- 오프라인 지원
- 자동 업데이트
- 네이티브 앱과 유사한 사용자 경험

## 🔍 서비스 디스커버리

API Gateway는 다음과 같은 서비스 디스커버리 기능을 제공합니다:

- **동적 서비스 등록**: 런타임에 새로운 서비스 등록
- **헬스 체크**: 30초마다 자동 서비스 상태 확인
- **프록시 라우팅**: 요청을 적절한 서비스로 자동 라우팅
- **장애 처리**: 비정상 서비스 요청 차단

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
