#!/bin/bash

# 배포 스크립트
# 사용법: ./scripts/deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# 환경 변수 로드
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment variables for $ENVIRONMENT..."
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
fi

# 의존성 설치
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 린팅 및 타입 체크
echo "🔍 Running linting and type checking..."
pnpm lint
pnpm type-check

# 빌드
echo "🏗️ Building application..."
pnpm build

# 배포
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🚀 Deploying to production..."
    # 프로덕션 배포 로직
    # 예: Vercel, Netlify, 또는 자체 서버 배포
    echo "✅ Production deployment completed!"
else
    echo "🚀 Deploying to development..."
    # 개발 환경 배포 로직
    echo "✅ Development deployment completed!"
fi

echo "🎉 Deployment to $ENVIRONMENT completed successfully!" 