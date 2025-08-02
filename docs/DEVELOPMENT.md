# TaeheonAI 개발 가이드

## 개발 환경 설정

### 필수 요구사항
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (Frontend 개발용)
- pnpm (Frontend 패키지 매니저)

### 초기 설정

1. **저장소 클론**
```bash
git clone https://github.com/your-username/taeheonai.git
cd taeheonai
```

2. **환경 변수 설정**
```bash
# 각 서비스의 env.example을 .env로 복사
cp gateway/env.example gateway/.env
cp services/auth-service/env.example services/auth-service/.env
cp services/user-service/env.example services/user-service/.env
cp services/notification-service/env.example services/notification-service/.env
```

3. **환경 변수 편집**
각 `.env` 파일을 편집하여 실제 값으로 설정하세요.

## 개발 워크플로우

### 1. 전체 서비스 실행
```bash
# 개발 환경 시작
make dev

# 서비스 상태 확인
make status

# 헬스 체크
make health
```

### 2. 개별 서비스 개발
```bash
# 특정 서비스만 실행
docker-compose up gateway user-service

# 특정 서비스 로그 확인
make logs-gateway
make logs-user
```

### 3. 테스트 실행
```bash
# 전체 테스트
make test

# 특정 서비스 테스트
make test-gateway
make test-auth
make test-user
make test-notification

# 커버리지 포함 테스트
make test-coverage
```

## 새로운 서비스 추가

### 1. 서비스 디렉토리 생성
```bash
mkdir services/new-service
cd services/new-service
```

### 2. 기본 파일 생성
```bash
# Dockerfile
touch Dockerfile

# requirements.txt
touch requirements.txt

# main.py
touch main.py

# env.example
touch env.example

# 테스트 디렉토리
mkdir tests
touch tests/__init__.py
touch tests/test_main.py
```

### 3. Dockerfile 예제
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
```

### 4. main.py 예제
```python
from fastapi import FastAPI
from datetime import datetime

app = FastAPI(title="New Service")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "service": "new-service"
    }

@app.get("/")
async def root():
    return {"message": "New Service is running"}
```

### 5. docker-compose.yml에 서비스 추가
```yaml
new-service:
  build:
    context: ./services/new-service
    dockerfile: Dockerfile
  ports:
    - "8004:8004"
  environment:
    - SERVICE_NAME=new-service
    - SERVICE_PORT=8004
    - REDIS_URL=redis://redis:6379
  restart: unless-stopped
  networks:
    - app-network
```

### 6. Gateway에 서비스 등록
`gateway/app/main.py`의 `INITIAL_SERVICES` 리스트에 추가:
```python
{
    "name": "new-service",
    "url": "http://localhost:8004",
    "health_url": "http://localhost:8004/health"
}
```

## 코드 품질 관리

### 1. 코드 포맷팅
```bash
# Python 코드 포맷팅
black gateway/app/
black services/*/

# TypeScript/JavaScript 코드 포맷팅
cd frontend
pnpm format
```

### 2. 린팅
```bash
# Python 린팅
flake8 gateway/app/
flake8 services/*/

# TypeScript/JavaScript 린팅
cd frontend
pnpm lint
```

### 3. 타입 체크
```bash
# Python 타입 체크
mypy gateway/app/
mypy services/*/

# TypeScript 타입 체크
cd frontend
pnpm type-check
```

## 디버깅

### 1. 로그 확인
```bash
# 전체 로그
make logs

# 특정 서비스 로그
make logs-gateway
make logs-user
make logs-auth
make logs-notification
```

### 2. 컨테이너 내부 접근
```bash
# 특정 서비스 컨테이너에 접근
docker-compose exec gateway bash
docker-compose exec user-service bash
```

### 3. 포트 확인
```bash
# 사용 중인 포트 확인
netstat -tulpn | grep :800
```

## 배포

### 1. 개발 환경 배포
```bash
# 개발 환경 빌드 및 실행
make build
make dev
```

### 2. 프로덕션 환경 배포
```bash
# 프로덕션 환경 실행
make start

# 또는 직접 실행
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Frontend 배포
```bash
cd frontend
pnpm build
pnpm start
```

## 문제 해결

### 1. 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :8000
lsof -i :8001
lsof -i :8002
lsof -i :8003

# 프로세스 종료
kill -9 <PID>
```

### 2. 컨테이너 문제
```bash
# 컨테이너 재시작
docker-compose restart

# 컨테이너 재빌드
docker-compose build --no-cache

# 모든 컨테이너 정리
make clean
```

### 3. Redis 연결 문제
```bash
# Redis 컨테이너 상태 확인
docker-compose ps redis

# Redis 로그 확인
docker-compose logs redis
```

## 성능 최적화

### 1. 메모리 사용량 최적화
- Docker 컨테이너 메모리 제한 설정
- 불필요한 로그 제거
- 이미지 크기 최소화

### 2. 응답 시간 최적화
- 데이터베이스 쿼리 최적화
- 캐싱 전략 구현
- 비동기 처리 활용

### 3. 확장성 고려
- 수평적 확장 가능한 설계
- 로드 밸런싱 고려
- 마이크로서비스 분리 원칙 준수

## 보안 고려사항

### 1. 환경 변수 관리
- 민감한 정보는 환경 변수로 관리
- .env 파일은 .gitignore에 포함
- 프로덕션에서는 시크릿 관리 시스템 사용

### 2. API 보안
- JWT 토큰 사용
- CORS 설정 적절히 구성
- 입력값 검증 강화

### 3. 컨테이너 보안
- 최신 베이스 이미지 사용
- 불필요한 패키지 제거
- 보안 스캔 정기적 실행 