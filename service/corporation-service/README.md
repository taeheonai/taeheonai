# Corporation Service

기업 정보를 관리하는 마이크로서비스입니다.

## 🏗️ 아키텍처

```
corporation-service/
├── app/
│   ├── common/           # 공통 모듈 (데이터베이스 연결 등)
│   ├── domain/           # 도메인 계층
│   │   ├── entity/       # 데이터베이스 엔티티
│   │   ├── repository/   # 데이터 접근 계층
│   │   ├── service/      # 비즈니스 로직
│   │   ├── controller/   # 요청 처리 컨트롤러
│   │   └── schema/       # Pydantic 스키마
│   └── router/           # API 라우터
├── Dockerfile            # Docker 이미지 설정
├── requirements.txt      # Python 의존성
└── README.md            # 이 파일
```

## 🚀 실행 방법

### 로컬 실행
```bash
cd service/corporation-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8009 --reload
```

### Docker 실행
```bash
cd service/corporation-service
docker build -t corporation-service .
docker run -p 8009:8009 corporation-service
```

## 📡 API 엔드포인트

### 기업 목록 조회
- `GET /v1/corporations?skip=0&limit=100`

### 기업 정보 조회
- `GET /v1/corporations/{corporation_id}`
- `GET /v1/corporations/code/{corp_code}`

### 기업 검색
- `GET /v1/corporations/search?query=삼성&limit=20`

### 기업 정보 생성
- `POST /v1/corporations`

### 기업 정보 수정
- `PUT /v1/corporations/{corporation_id}`

### 기업 정보 삭제
- `DELETE /v1/corporations/{corporation_id}`

### 기업 ID 유효성 검증
- `GET /v1/corporations/validate/{corporation_id}`

## 🗄️ 데이터베이스

PostgreSQL을 사용하며, `corporation` 테이블에 기업 정보를 저장합니다.

### 테이블 구조
```sql
CREATE TABLE corporation (
    id SERIAL PRIMARY KEY,
    corp_code VARCHAR UNIQUE NOT NULL,
    companyname VARCHAR NOT NULL,
    market VARCHAR,
    dart_code VARCHAR,
    industry VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 환경 변수

```bash
DATABASE_URL=postgresql+asyncpg://username:password@host:port/database
```

## 📚 사용 예시

### 프론트엔드에서 기업 목록 조회
```typescript
// 회원가입 시 기업 드롭다운용
const response = await fetch('/api/v1/corporations?limit=1000');
const corporations = await response.json();
```

### auth-service에서 기업 ID 검증
```python
from app.common.corporation_client import CorporationClient

async def validate_user_corporation(corporation_id: int):
    async with CorporationClient() as client:
        is_valid = await client.validate_corporation_exists(corporation_id)
        if not is_valid:
            raise HTTPException(status_code=400, detail="유효하지 않은 기업 ID")
```

## 🔗 다른 서비스와의 연동

- **auth-service**: 사용자 가입 시 기업 ID 검증
- **gri-service**: GRI 보고서 작성 시 기업 정보 참조
- **materiality-service**: 머티리얼리티 평가 시 기업 정보 참조

## 🚨 주의사항

1. **데이터 소유권**: 기업 정보는 이 서비스가 단일 소스로 관리
2. **동기 검증**: 다른 서비스에서 기업 ID 검증 시 이 서비스의 API 호출
3. **캐싱**: 자주 조회되는 기업 정보는 Redis 등으로 캐싱 고려
