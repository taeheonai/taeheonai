# TaeheonAI API 문서

## 개요

TaeheonAI는 마이크로서비스 아키텍처 기반의 AI 플랫폼입니다. 각 서비스는 독립적으로 운영되며, API Gateway를 통해 통합됩니다.

## 서비스 목록

### 1. API Gateway (포트: 8000)

#### 헬스 체크
```
GET /health
```

**응답:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "gateway": "TaeheonAI API Gateway",
  "version": "1.0.0"
}
```

#### 서비스 목록 조회
```
GET /services
```

**응답:**
```json
{
  "services": [
    {
      "name": "user-service",
      "url": "http://localhost:8001",
      "status": "healthy",
      "last_check": "2024-01-01T00:00:00"
    }
  ],
  "stats": {
    "total_services": 3,
    "healthy_services": 3,
    "unhealthy_services": 0
  }
}
```

### 2. 사용자 서비스 (포트: 8001)

#### 사용자 생성
```
POST /users
```

**요청:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "full_name": "Test User"
}
```

**응답:**
```json
{
  "id": "user_123",
  "username": "testuser",
  "email": "test@example.com",
  "full_name": "Test User",
  "created_at": "2024-01-01T00:00:00"
}
```

#### 사용자 조회
```
GET /users/{user_id}
```

#### 사용자 목록 조회
```
GET /users?page=1&limit=10
```

#### 사용자 업데이트
```
PUT /users/{user_id}
```

#### 사용자 삭제
```
DELETE /users/{user_id}
```

### 3. 인증 서비스 (포트: 8002)

#### 사용자 등록
```
POST /register
```

**요청:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "securepassword123"
}
```

#### 로그인
```
POST /login
```

**요청:**
```json
{
  "username": "testuser",
  "password": "securepassword123"
}
```

**응답:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### 토큰 검증
```
POST /verify-token
```

### 4. 알림 서비스 (포트: 8003)

#### 이메일 발송
```
POST /send-email
```

**요청:**
```json
{
  "to_email": "user@example.com",
  "subject": "Welcome to TaeheonAI",
  "message": "Welcome to our platform!",
  "template": "welcome"
}
```

#### 푸시 알림 발송
```
POST /send-push
```

**요청:**
```json
{
  "user_id": "user_123",
  "title": "New Message",
  "body": "You have a new message",
  "data": {
    "type": "message",
    "message_id": "msg_456"
  }
}
```

#### SMS 발송
```
POST /send-sms
```

**요청:**
```json
{
  "phone_number": "+1234567890",
  "message": "Your verification code is 123456"
}
```

#### 알림 히스토리 조회
```
GET /notifications?user_id=user_123&page=1&limit=10
```

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 422 | 유효성 검사 실패 |
| 500 | 서버 내부 오류 |

## 인증

대부분의 API 엔드포인트는 JWT 토큰을 통한 인증이 필요합니다. 토큰은 Authorization 헤더에 Bearer 스키마로 전송됩니다:

```
Authorization: Bearer <your-jwt-token>
```

## 레이트 리미팅

API 요청은 레이트 리미팅이 적용됩니다:
- 일반 요청: 분당 100회
- 인증 관련 요청: 분당 10회
- 알림 발송: 분당 5회

## 개발 환경

### 로컬 개발
```bash
# 전체 서비스 실행
make dev

# 특정 서비스만 실행
docker-compose up gateway user-service
```

### 테스트
```bash
# 전체 테스트
make test

# 특정 서비스 테스트
make test-gateway
make test-auth
make test-user
make test-notification
```

## 모니터링

### 헬스 체크
```bash
make health
```

### 로그 확인
```bash
make logs
make logs-gateway
make logs-user
make logs-auth
make logs-notification
``` 