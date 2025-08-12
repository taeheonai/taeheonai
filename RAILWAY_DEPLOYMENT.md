# Railway 배포 가이드

## 🚀 Railway에 배포하기

### **1. Railway 계정 및 프로젝트 설정**
- [Railway](https://railway.app/)에서 계정 생성
- "New Project" → "Deploy from GitHub repo" 선택
- GitHub 저장소 연결

### **2. 환경변수 설정**
Railway 대시보드에서 다음 환경변수 설정:

```
DATABASE_URL=postgresql://postgres:비밀번호@호스트:포트/데이터베이스
ENVIRONMENT=production
PORT=8008
PYTHONUNBUFFERED=1
```

### **3. 배포 설정**
- **Build Command**: `docker build -t auth-service .`
- **Start Command**: `docker run -p 8008:8008 auth-service`
- **Root Directory**: `service/auth-service`

### **4. PostgreSQL 데이터베이스 생성**
1. Railway에서 "New" → "Database" → "PostgreSQL" 선택
2. 생성된 데이터베이스의 "Connect" 버튼 클릭
3. 연결 정보에서 DATABASE_URL 복사
4. 환경변수에 설정

### **5. 배포 확인**
- Railway 대시보드에서 배포 상태 확인
- 로그에서 오류 메시지 확인
- 헬스체크 엔드포인트 테스트: `https://your-app.railway.app/health`

## 🔧 로컬 테스트

### **환경변수 설정**
프로젝트 루트에 `.env` 파일 생성:
```bash
DATABASE_URL=postgresql://postgres:비밀번호@호스트:포트/데이터베이스
```

### **로컬 실행**
```bash
# 서비스 중지
docker compose down

# 환경변수와 함께 실행
docker compose up -d
```

## 🚨 주의사항

1. **보안**: Railway 환경변수는 안전하게 관리
2. **포트**: Railway는 자동으로 포트 할당
3. **데이터베이스**: Railway PostgreSQL 사용 권장
4. **로그**: Railway 대시보드에서 실시간 로그 확인

## 📊 배포 후 확인사항

- [ ] 서비스가 정상적으로 시작됨
- [ ] 데이터베이스 연결 성공
- [ ] 헬스체크 엔드포인트 응답
- [ ] 로그인/회원가입 기능 정상 작동
