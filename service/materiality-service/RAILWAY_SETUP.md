# Materiality Service Railway 배포 가이드

## 🚀 **Railway Variables 설정**

### **1. Railway 대시보드에서 Variables 설정**

#### **기본 환경변수**
```bash
# Railway 환경 설정
RAILWAY_ENVIRONMENT=true
PORT=8002
SERVICE_NAME=materiality-service
PYTHONUNBUFFERED=1
```

#### **데이터베이스 연결**
```bash
# PostgreSQL 연결 (Railway PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway
```

#### **프론트엔드 도메인 설정**
```bash
# taeheonai.com 도메인 설정
FRONTEND_URL=https://taeheonai.com
SURVEY_BASE_URL=https://taeheonai.com/survey
```

#### **서비스 설정**
```bash
# 서비스 설정
SERVICE_HOST=0.0.0.0
LOG_LEVEL=INFO
ENVIRONMENT=production
DEBUG=false

# Materiality 관련 설정
MATERIALITY_THRESHOLD=0.05
MATERIALITY_CALCULATION_METHOD=quantitative
MATERIALITY_REPORT_FORMAT=json
```

#### **JWT 설정 (필요시)**
```bash
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### **Gmail API 설정 (이메일 발송 기능 사용시)**
```bash
GMAIL_USER_EMAIL=your-email@gmail.com
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
```

### **2. 배포 설정**

#### **Dockerfile 경로**
- `Dockerfile` (루트 디렉토리)

#### **포트 설정**
- Railway에서 자동으로 `PORT` 환경변수 설정
- 서비스는 8002 포트에서 실행

### **3. Gateway 연결 설정**

Gateway의 `ServiceFactory`에서 materiality-service URL을 업데이트:

```python
# gateway/app/domain/model/service_factory.py
ServiceType.materiality: os.getenv("MATERIALITY_SERVICE_URL", "https://materiality-service-production.up.railway.app"),
```

### **4. 테스트 방법**

#### **Materiality Service 헬스체크**
```bash
curl https://materiality-service-production.up.railway.app/health
```

#### **Gateway를 통한 접근**
```bash
curl https://taeheonai-production-2130.up.railway.app/api/v1/materiality/health
```

#### **설문 생성 테스트**
```bash
curl -X POST https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys \
  -H "Content-Type: application/json" \
  -d '{
    "corporation_id": "123",
    "company_name": "테스트 회사",
    "send_email": false
  }'
```

### **5. 주요 엔드포인트**

- **헬스체크**: `/health`
- **설문 생성**: `/surveys`
- **설문 조회**: `/surveys/{survey_id}`
- **설문 응답 제출**: `/surveys/{survey_id}/responses`
- **미디어 검색**: `/search-media`
- **엑셀 다운로드**: `/download-excel/{filename}`

### **6. 문제 해결**

#### **데이터베이스 연결 오류**
- `DATABASE_URL` 환경변수 확인
- PostgreSQL 서비스가 Railway에 배포되었는지 확인

#### **Gateway 연결 오류**
- Gateway의 `MATERIALITY_SERVICE_URL` 환경변수 확인
- materiality-service가 정상적으로 배포되었는지 확인

#### **CORS 오류**
- Gateway의 CORS 설정에서 taeheonai.com 도메인 허용 확인
- `RAILWAY_ENVIRONMENT=true` 설정 확인
