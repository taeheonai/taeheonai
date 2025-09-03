# KangYouWon Frontend

Next.js 기반의 현대적인 웹 애플리케이션입니다.

## 🚀 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **PWA**: next-pwa
- **Package Manager**: pnpm
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## 📋 요구사항

- Node.js 18.17.0 이상
- pnpm 8.0.0 이상

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
cp env.local.example .env.local
# .env.local 파일을 편집하여 필요한 값들을 설정하세요
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 4. 빌드

```bash
pnpm build
```

### 5. 프로덕션 서버 실행

```bash
pnpm start
```

## 🔧 사용 가능한 스크립트

- `pnpm dev` - 개발 서버 실행 (Turbopack)
- `pnpm build` - 프로덕션 빌드
- `pnpm start` - 프로덕션 서버 실행
- `pnpm lint` - ESLint 실행
- `pnpm type-check` - TypeScript 타입 체크
- `pnpm clean` - 빌드 파일 정리

## 📱 PWA 기능

- 오프라인 지원
- 홈 화면에 추가 가능
- 네이티브 앱과 같은 사용자 경험

## 🚀 배포

### Vercel 배포

1. Vercel 계정 생성 및 프로젝트 연결
2. GitHub 저장소와 연결
3. 환경 변수 설정:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

### GitHub Actions CI/CD

- `main` 브랜치에 푸시 시 자동으로 프로덕션 배포
- `develop` 브랜치에 푸시 시 자동으로 스테이징 배포
- Pull Request 시 자동 테스트 및 빌드

## 📁 프로젝트 구조

```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # 루트 레이아웃
│   └── page.tsx        # 홈페이지
├── components/          # 재사용 가능한 컴포넌트
├── store/              # Zustand 스토어
│   └── useStore.ts
├── lib/                # 유틸리티 및 설정
│   └── axios.ts
└── styles/             # 전역 스타일
    └── globals.css
```

## 🔐 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | API 서버 URL | `http://localhost:3000/api` |
| `NEXT_PUBLIC_APP_NAME` | 애플리케이션 이름 | `KangYouWon` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | 애플리케이션 설명 | `KangYouWon PWA Application` |

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.
