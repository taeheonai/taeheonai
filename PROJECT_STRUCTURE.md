# TaeheonAI 프로젝트 구조

## 전체 구조

```
taeheonai/
├── 📁 gateway/                    # API Gateway (FastAPI)
│   ├── 📁 app/
│   │   ├── 📄 main.py            # 메인 애플리케이션
│   │   ├── 📄 models.py          # 데이터 모델
│   │   ├── 📄 proxy.py           # 프록시 서비스
│   │   ├── 📄 service_discovery.py # 서비스 디스커버리
│   │   ├── 📄 requirements.txt   # Python 의존성
│   │   └── 📄 Dockerfile         # Docker 설정
│   ├── 📁 tests/                 # 테스트 파일들
│   │   ├── 📄 __init__.py
│   │   └── 📄 test_main.py
│   └── 📄 env.example            # 환경 변수 예제
├── 📁 services/                  # 마이크로서비스들
│   ├── 📁 auth-service/          # 인증 서비스
│   │   ├── 📄 main.py
│   │   ├── 📄 requirements.txt
│   │   ├── 📄 Dockerfile
│   │   ├── 📄 env.example
│   │   └── 📁 tests/
│   │       ├── 📄 __init__.py
│   │       └── 📄 test_main.py
│   ├── 📁 user-service/          # 사용자 관리 서비스
│   │   ├── 📄 main.py
│   │   ├── 📄 requirements.txt
│   │   ├── 📄 Dockerfile
│   │   ├── 📄 env.example
│   │   └── 📁 tests/
│   │       ├── 📄 __init__.py
│   │       └── 📄 test_main.py
│   └── 📁 notification-service/   # 알림 서비스
│       ├── 📄 main.py
│       ├── 📄 requirements.txt
│       ├── 📄 Dockerfile
│       ├── 📄 env.example
│       └── 📁 tests/
│           ├── 📄 __init__.py
│           └── 📄 test_main.py
├── 📁 frontend/                  # Next.js 프론트엔드
│   ├── 📁 src/
│   │   ├── 📁 app/              # App Router
│   │   │   ├── 📄 layout.tsx
│   │   │   ├── 📄 page.tsx
│   │   │   ├── 📄 globals.css
│   │   │   └── 📄 favicon.ico
│   │   ├── 📁 lib/              # 유틸리티
│   │   │   └── 📄 api.ts
│   │   └── 📁 store/            # 상태 관리
│   │       └── 📄 index.ts
│   ├── 📁 scripts/              # 배포 스크립트
│   │   └── 📄 deploy.sh
│   ├── 📄 package.json
│   ├── 📄 pnpm-lock.yaml
│   ├── 📄 next.config.ts
│   ├── 📄 tsconfig.json
│   ├── 📄 eslint.config.mjs
│   ├── 📄 postcss.config.mjs
│   ├── 📄 env.example
│   └── 📄 README.md
├── 📁 docs/                      # 문서
│   ├── 📄 API.md                # API 문서
│   └── 📄 DEVELOPMENT.md        # 개발 가이드
├── 📄 docker-compose.yml         # 개발 환경 Docker Compose
├── 📄 docker-compose.prod.yml    # 프로덕션 환경 Docker Compose
├── 📄 Makefile                   # 개발 도구
├── 📄 package.json               # 루트 패키지 설정
├── 📄 pytest.ini                # pytest 설정
├── 📄 README.md                  # 프로젝트 README
├── 📄 PROJECT_STRUCTURE.md       # 이 파일
├── 📄 .gitignore                 # Git 무시 파일
└── 📄 .gitattributes            # Git 속성 설정
```

## 서비스별 상세 구조

### 1. Gateway (포트: 8000)
- **역할**: API Gateway, 서비스 디스커버리, 프록시
- **기술**: FastAPI, Redis
- **주요 기능**:
  - 모든 서비스 요청의 진입점
  - 서비스 디스커버리 및 헬스 체크
  - 요청 라우팅 및 프록시
  - CORS 처리

### 2. Auth Service (포트: 8002)
- **역할**: 사용자 인증 및 인가
- **기술**: FastAPI, JWT
- **주요 기능**:
  - 사용자 등록/로그인
  - JWT 토큰 발급/검증
  - 비밀번호 해싱
  - 세션 관리

### 3. User Service (포트: 8001)
- **역할**: 사용자 정보 관리
- **기술**: FastAPI
- **주요 기능**:
  - 사용자 CRUD 작업
  - 프로필 관리
  - 사용자 설정 관리

### 4. Notification Service (포트: 8003)
- **역할**: 알림 발송
- **기술**: FastAPI
- **주요 기능**:
  - 이메일 발송
  - 푸시 알림
  - SMS 발송
  - 알림 히스토리 관리

### 5. Frontend (포트: 3000)
- **역할**: 웹 클라이언트
- **기술**: Next.js 15, React 19, TypeScript
- **주요 기능**:
  - 사용자 인터페이스
  - API 통신
  - 상태 관리 (Zustand)

## 데이터베이스 구조

### Redis (포트: 6379)
- **용도**: 서비스 디스커버리, 세션 저장, 캐싱
- **데이터 구조**:
  - 서비스 등록 정보
  - 세션 토큰
  - 임시 캐시 데이터

## 네트워크 구조

### Docker 네트워크
- **app-network**: 모든 서비스가 연결된 브리지 네트워크
- **외부 접근**: Gateway만 외부에서 접근 가능
- **내부 통신**: 서비스 간 내부 네트워크로 통신

## 포트 매핑

| 서비스 | 내부 포트 | 외부 포트 | 설명 |
|--------|-----------|-----------|------|
| Gateway | 8000 | 8000 | API Gateway |
| User Service | 8001 | 8001 | 사용자 관리 |
| Auth Service | 8002 | 8002 | 인증 서비스 |
| Notification Service | 8003 | 8003 | 알림 서비스 |
| Redis | 6379 | 6379 | 캐시/디스커버리 |
| Frontend | 3000 | 3000 | 웹 클라이언트 |

## 환경 변수 구조

### 공통 환경 변수
- `SERVICE_NAME`: 서비스 이름
- `SERVICE_PORT`: 서비스 포트
- `REDIS_URL`: Redis 연결 URL
- `LOG_LEVEL`: 로그 레벨

### 서비스별 환경 변수
- **Gateway**: CORS 설정, API 버전 등
- **Auth Service**: JWT 시크릿, 토큰 만료 시간 등
- **User Service**: 데이터베이스 URL, 파일 업로드 설정 등
- **Notification Service**: SMTP 설정, Firebase 설정 등

## 테스트 구조

### 테스트 파일 위치
- `gateway/tests/`: Gateway 테스트
- `services/*/tests/`: 각 서비스별 테스트
- `pytest.ini`: 전체 테스트 설정

### 테스트 명령어
```bash
make test              # 전체 테스트
make test-gateway      # Gateway 테스트
make test-auth         # Auth Service 테스트
make test-user         # User Service 테스트
make test-notification # Notification Service 테스트
make test-coverage     # 커버리지 포함 테스트
```

## 배포 구조

### 개발 환경
- `docker-compose.yml`: 개발용 설정
- 로컬 볼륨 마운트
- 디버그 모드 활성화

### 프로덕션 환경
- `docker-compose.prod.yml`: 프로덕션용 설정
- 최적화된 이미지
- 보안 강화 설정

## 모니터링 및 로깅

### 로그 확인
```bash
make logs              # 전체 로그
make logs-gateway      # Gateway 로그
make logs-user         # User Service 로그
make logs-auth         # Auth Service 로그
make logs-notification # Notification Service 로그
```

### 헬스 체크
```bash
make health            # 모든 서비스 헬스 체크
make status            # 서비스 상태 확인
```

## 보안 구조

### 인증 흐름
1. 사용자가 Auth Service에 로그인
2. JWT 토큰 발급
3. 다른 서비스 요청 시 토큰 검증
4. Gateway에서 토큰 검증 후 라우팅

### 환경 변수 보안
- 민감한 정보는 환경 변수로 관리
- `.env` 파일은 `.gitignore`에 포함
- 프로덕션에서는 시크릿 관리 시스템 사용

## 확장성 고려사항

### 수평적 확장
- 각 서비스는 독립적으로 스케일링 가능
- Redis를 통한 서비스 디스커버리
- 로드 밸런서를 통한 트래픽 분산

### 새로운 서비스 추가
1. `services/` 디렉토리에 새 서비스 폴더 생성
2. 기본 파일들 생성 (main.py, requirements.txt, Dockerfile 등)
3. `docker-compose.yml`에 서비스 등록
4. Gateway의 서비스 디스커버리에 등록
5. 테스트 파일 작성

## 개발 워크플로우

### 1. 개발 시작
```bash
make dev              # 개발 환경 시작
make status           # 서비스 상태 확인
make health           # 헬스 체크
```

### 2. 개발 중
```bash
make logs-gateway     # 특정 서비스 로그 확인
docker-compose exec gateway bash  # 컨테이너 내부 접근
```

### 3. 테스트
```bash
make test             # 전체 테스트
make test-coverage    # 커버리지 포함 테스트
```

### 4. 배포
```bash
make build            # 이미지 빌드
make start            # 프로덕션 환경 시작
```

## 문제 해결

### 일반적인 문제들
1. **포트 충돌**: `lsof -i :8000`으로 확인 후 프로세스 종료
2. **컨테이너 문제**: `docker-compose restart` 또는 `make clean`
3. **Redis 연결 문제**: Redis 컨테이너 상태 확인
4. **환경 변수 문제**: `.env` 파일 설정 확인

### 디버깅 도구
- `make logs`: 실시간 로그 확인
- `docker-compose exec`: 컨테이너 내부 접근
- `make health`: 서비스 상태 확인
- `netstat -tulpn`: 포트 사용 현황 확인 