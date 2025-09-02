# Gateway Railway 설정 가이드

## 🚀 **Railway Variables 설정**

### **1. Railway 대시보드에서 Variables 설정**

#### **기본 환경변수**
```bash
# Railway 환경 설정
RAILWAY_ENVIRONMENT=true
PORT=8080
SERVICE_NAME=gateway
```

#### **Database 연결 (Variable Reference 사용)**
1. "Add Reference" 클릭
2. Postgres 서비스 선택
3. `DATABASE_URL` 변수 참조 추가

#### **서비스 URL 환경변수들**
```bash
# 마이크로서비스 URL들 (Railway 도메인으로 설정)
AUTH_SERVICE_URL=https://auth-service-xxx.up.railway.app
CHATBOT_SERVICE_URL=https://chatbot-service-xxx.up.railway.app
MATERIALITY_SERVICE_URL=https://materiality-service-xxx.up.railway.app
GRI_SERVICE_URL=https://gri-service-xxx.up.railway.app
REPORT_SERVICE_URL=https://report-service-xxx.up.railway.app

SURVEY_SERVICE_URL=https://survey-service-xxx.up.railway.app
```

### **2. 환경별 동작**

#### **Railway 환경 (RAILWAY_ENVIRONMENT=true)**
- CORS: 프로덕션 도메인만 허용
- 서비스 연결: Railway 도메인 사용
- 로깅: 프로덕션 레벨

#### **로컬 환경 (RAILWAY_ENVIRONMENT=false 또는 미설정)**
- CORS: localhost 허용
- 서비스 연결: 로컬 포트 사용
- 로깅: 개발 레벨

### **3. 서비스 배포 순서**

1. **Postgres 서비스** (이미 배포됨)
2. **Gateway 서비스** (현재 설정 중)
3. **Auth Service** (다음 단계)
4. **기타 마이크로서비스들**

### **4. 테스트 방법**

#### **Gateway 헬스체크**
```bash
curl https://your-gateway-domain.up.railway.app/health
```

#### **환경변수 확인**
```bash
curl https://your-gateway-domain.up.railway.app/api/v1/auth/health
```

### **5. 문제 해결**

#### **CORS 오류**
- Railway 환경변수에서 `RAILWAY_ENVIRONMENT=true` 확인
- CORS origins에 프론트엔드 도메인 포함 확인

#### **서비스 연결 오류**
- 각 서비스 URL 환경변수 확인
- 해당 서비스가 Railway에 배포되었는지 확인

#### **데이터베이스 연결 오류**
- Postgres Variable Reference가 올바르게 설정되었는지 확인
- `DATABASE_URL` 환경변수 값 확인
