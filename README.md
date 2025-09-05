# ESG MATE - ESG 공시 보고서 자동화 플랫폼

**ESG 경영의 핵심, 중대성 평가를 자동화하고 GRI, TCFD Report를 효율적으로 생성하는 통합 플랫폼**

## 🎯 프로젝트 개요

ESG MATE는 기업의 ESG 공시 보고서 작성을 완전 자동화하는 혁신적인 플랫폼입니다. 중대성 평가부터 GRI 표준에 따른 보고서 생성까지, 복잡하고 시간이 많이 소요되는 ESG 공시 프로세스를 AI 기술로 혁신했습니다.

### 🌟 핵심 가치
- **자동화**: 수동 작업을 AI로 대체하여 90% 시간 단축
- **표준화**: GRI, TCFD 국제 표준 완벽 준수
- **효율성**: 통합 플랫폼으로 원스톱 서비스 제공
- **정확성**: LLM 기반 고품질 윤문 및 검증

## 🏗️ 시스템 아키텍처

```
ESG MATE/
├── 🌐 gateway/              # API Gateway (인증/프록시/CORS)
├── 🛠️ service/             # 마이크로서비스
│   ├── auth-service/        # 인증/회원가입 (8008)
│   ├── corporation-service/ # 기업 정보 관리 (8009)
│   ├── materiality-service/ # 중대성 평가 (8002)
│   ├── gri-service/        # GRI 표준 관리 (8003)
│   ├── llm-service/        # LLM 윤문 (8005)
│   ├── report-service/     # GRI 보고서 생성 (8004)
│   ├── survey-service/     # 설문 관리 (8007)
│   └── chatbot-service/    # 챗봇 (8001)
└── 🎨 frontend/           # Next.js 프론트엔드 (3000)
```

## 🚀 주요 기능

### 1. 📊 중대성 평가 자동화
- **미디어 검색**: 기업 관련 뉴스/보도자료 자동 수집
- **AI 분석**: 감정 분석, 관련성 평가, 중요도 점수 계산
- **카테고리 랭킹**: ESG 분류별 자동 순위 결정
- **설문 통합**: 내부 이해관계자 설문과 AI 분석 결과 융합

### 2. 📋 GRI 표준 매핑
- **자동 매핑**: 중대성 평가 결과를 GRI 인덱스로 자동 변환
- **ESG 분류**: Environmental, Social, Governance 자동 분류
- **표준 준수**: GRI Universal Standards 2021 완벽 지원
- **질문 생성**: 각 GRI 인덱스별 맞춤형 질문 자동 생성

### 3. ✍️ AI 윤문 시스템
- **LLM 기반**: GPT-3.5-turbo를 활용한 고품질 윤문
- **표 자동화**: 사용자 입력을 마크다운 테이블로 자동 변환
- **회사명 적용**: 기업별 맞춤형 보고서 생성
- **표준 형식**: GRI 공시 기준에 맞는 일관된 형식

### 4. 📈 통합 보고서 생성
- **실시간 미리보기**: 작성 과정을 실시간으로 확인
- **다중 형식**: PDF, HTML, Word 등 다양한 형식 지원
- **검증 시스템**: 자동 검증 및 품질 관리
- **버전 관리**: 보고서 버전별 추적 및 관리

## 🛠️ 기술 스택

### Backend (마이크로서비스)
- **FastAPI** - 고성능 비동기 웹 프레임워크
- **SQLAlchemy** - ORM 및 데이터베이스 관리
- **PostgreSQL** - 메인 데이터베이스
- **Redis** - 캐싱 및 세션 관리
- **LangChain** - LLM 통합 및 프롬프트 관리
- **OpenAI GPT-3.5-turbo** - AI 윤문 엔진
- **httpx** - 비동기 HTTP 클라이언트

### Frontend
- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성 보장
- **TailwindCSS** - 유틸리티 기반 스타일링
- **Zustand** - 상태 관리
- **ReactMarkdown** - 마크다운 렌더링
- **PWA** - 모바일 앱 경험

### Infrastructure
- **Docker** - 컨테이너화 및 배포
- **Railway** - 클라우드 인프라
- **API Gateway** - 서비스 통합 및 라우팅
- **CORS** - 크로스 오리진 보안

## 📋 서비스 상세

| 서비스 | 포트 | 주요 기능 | 기술 스택 |
|--------|------|-----------|-----------|
| **Gateway** | 8080 | API 통합, 인증, CORS | FastAPI, httpx |
| **Auth Service** | 8008 | 회원가입, 로그인, JWT | FastAPI, SQLAlchemy |
| **Corporation Service** | 8009 | 기업 정보 관리 | FastAPI, PostgreSQL |
| **Materiality Service** | 8002 | 중대성 평가, 미디어 분석 | FastAPI, AI/ML |
| **GRI Service** | 8003 | GRI 표준, 질문 관리 | FastAPI, SQLAlchemy |
| **LLM Service** | 8005 | AI 윤문, 프롬프트 관리 | LangChain, OpenAI |
| **Report Service** | 8004 | 보고서 생성, PDF 변환 | FastAPI, ReportLab |
| **Survey Service** | 8007 | 설문 관리, 응답 수집 | FastAPI, Email |
| **Frontend** | 3000 | 사용자 인터페이스 | Next.js, TypeScript |

## 🔄 워크플로우

### 1단계: 중대성 평가
```
기업 선택 → 미디어 검색 → AI 분석 → 카테고리 랭킹 → 설문 통합 → 최종 평가
```

### 2단계: GRI 매핑
```
중대성 결과 → ESG 분류 → GRI 인덱스 매핑 → 질문 생성 → 데이터 수집
```

### 3단계: 윤문 및 보고서
```
데이터 입력 → AI 윤문 → 표 자동화 → 검증 → 보고서 생성 → 다운로드
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 저장소 클론
git clone https://github.com/taeheonai/taeheonai.git
cd taeheonai

# 환경 변수 설정
cp gateway/.env.example gateway/.env
cp service/*/env.example service/*/.env
```

### 2. 서비스 실행
```bash
# Docker Compose로 전체 서비스 실행
docker-compose up -d

# 또는 개별 서비스 실행
docker-compose up -d gateway auth-service materiality-service
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

## 📊 API 사용 예시

### 중대성 평가 시작
```bash
curl -X POST http://localhost:8080/api/v1/materiality/assessment \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-client-key" \
  -d '{
    "company_id": 2506,
    "company_name": "한온시스템",
    "search_period": "2023-01-01,2023-12-31"
  }'
```

### GRI 윤문 요청
```bash
curl -X POST http://localhost:8080/api/v1/polish \
  -H "Content-Type: application/json" \
  -H "X-Client-Key: your-client-key" \
  -d '{
    "session_key": "session_123",
    "gri_index": "201-1",
    "answers": [{"question_id": 1, "text": "매출액: 1000억원"}],
    "extra_meta": {
      "corporation_name": "한온시스템",
      "tables_markdown": "| 항목 | 값 |\n| --- | --- |"
    }
  }'
```

## 🔍 모니터링 및 디버깅

### 서비스 상태 확인
```bash
# Gateway 상태
curl http://localhost:8080/api/v1/health

# 개별 서비스 상태
curl http://localhost:8002/health  # Materiality Service
curl http://localhost:8005/health  # LLM Service
```

### 로그 확인
```bash
# Docker 컨테이너 로그
docker logs esg_mate-gateway-1
docker logs esg_mate-materiality-service-1
```

## 🎯 비즈니스 임팩트

### 📈 효율성 향상
- **90% 시간 단축**: 수동 작업을 AI로 자동화
- **정확도 향상**: 표준화된 프로세스로 오류 최소화
- **비용 절감**: 외부 컨설팅 의존도 감소

### 🌍 ESG 경영 지원
- **국제 표준 준수**: GRI, TCFD 완벽 지원
- **투명성 확보**: 체계적인 공시 프로세스
- **리스크 관리**: 중대성 평가를 통한 사전 대응

### 🚀 혁신적 접근
- **AI 융합**: 최신 LLM 기술 활용
- **사용자 중심**: 직관적인 UI/UX
- **확장성**: 마이크로서비스 아키텍처

## 🔮 향후 계획

### 단기 (3개월)
- [ ] TCFD 보고서 지원 확대
- [ ] 모바일 앱 출시
- [ ] 다국어 지원 (영어, 일본어)

### 중기 (6개월)
- [ ] ESRS (EU) 표준 지원
- [ ] 실시간 대시보드
- [ ] API 마켓플레이스

### 장기 (1년)
- [ ] 글로벌 진출
- [ ] AI 모델 고도화
- [ ] 블록체인 검증 시스템

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- **웹사이트**: https://taeheonai.com
- **이메일**: contact@taeheonai.com
- **GitHub**: https://github.com/taeheonai/taeheonai

---

**ESG MATE** - ESG 공시의 새로운 패러다임을 제시합니다. 🌱