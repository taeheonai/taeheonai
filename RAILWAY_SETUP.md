# Railway PostgreSQL 설정 가이드

## 🚀 Railway PostgreSQL 설정

### 1. Railway 계정 생성 및 로그인
- [Railway](https://railway.app/)에서 계정 생성
- GitHub 계정으로 로그인

### 2. PostgreSQL 데이터베이스 생성
1. Railway 대시보드에서 "New Project" 클릭
2. "Provision PostgreSQL" 선택
3. 데이터베이스 이름 설정 (예: `esg_mate_db`)
4. 생성 완료 후 "Connect" 버튼 클릭

### 3. 연결 정보 복사
PostgreSQL 연결 정보에서 다음을 복사:
- **Host**: `containers-us-west-XX.railway.app`
- **Port**: `XXXXX`
- **Database**: `railway`
- **Username**: `postgres`
- **Password**: `XXXXXXXX`

### 4. DATABASE_URL 생성
다음 형식으로 DATABASE_URL 생성:
```
postgresql://postgres:XXXXXXXX@containers-us-west-XX.railway.app:XXXXX/railway
```

### 5. 환경변수 설정
프로젝트 루트에 `.env` 파일 생성:
```bash
# Railway PostgreSQL 연결 정보
DATABASE_URL=postgresql://postgres:XXXXXXXX@containers-us-west-XX.railway.app:XXXXX/railway

# 서비스 포트 설정
GATEWAY_PORT=8080
AUTH_SERVICE_PORT=8008
CHATBOT_SERVICE_PORT=8001
MATERIALITY_SERVICE_PORT=8002
GRI_SERVICE_PORT=8003
GRIREPORT_SERVICE_PORT=8004
TCFD_SERVICE_PORT=8005
TCFDREPORT_SERVICE_PORT=8006
SURVEY_SERVICE_PORT=8007

# 환경 설정
ENVIRONMENT=development
```

### 6. 연결 테스트
```bash
python test_railway_connection.py
```

### 7. 서비스 재시작
```bash
# 기존 서비스 중지
docker-compose down

# Railway PostgreSQL로 서비스 시작
docker-compose up -d
```

## 🔧 문제 해결

### DATABASE_URL 오류
- 환경변수가 올바르게 설정되었는지 확인
- Railway 대시보드에서 연결 정보 재확인

### 연결 타임아웃
- Railway 데이터베이스가 활성 상태인지 확인
- 방화벽 설정 확인

### 인증 오류
- 사용자명과 비밀번호 재확인
- Railway에서 데이터베이스 재생성

## 📊 데이터베이스 관리

### 테이블 생성
서비스 시작 시 자동으로 테이블이 생성됩니다.

### 데이터 확인
```bash
# Railway 대시보드에서 직접 확인
# 또는 연결 테스트 스크립트 실행
```

## 🚨 주의사항

1. **보안**: `.env` 파일을 Git에 커밋하지 마세요
2. **백업**: 중요한 데이터는 정기적으로 백업하세요
3. **비용**: Railway 무료 플랜의 제한사항을 확인하세요
