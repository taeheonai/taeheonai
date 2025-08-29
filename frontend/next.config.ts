import type { NextConfig } from "next";
import withPWA from "next-pwa";

// PWA 설정 - 자동 생성(GenerateSW) 방식
const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // dev에서는 비활성화
  register: true,
  skipWaiting: true,
  // Vercel 배포 시 PWA 파일 접근 문제 해결
  buildExcludes: [/middleware-manifest\.json$/],
  // runtimeCaching 같은 커스텀은 지금은 넣지 말고, 빌드 성공 후 점진 추가
});

// Vercel 배포 환경인지 확인
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

const nextConfig: NextConfig = {
  // 로컬에서는 standalone 비활성화, Vercel 배포일 때만 활성화
  ...(isVercel ? { output: 'standalone' as const } : {}),
  
  // SPA 라우팅을 위한 설정
  trailingSlash: false,
  
  // RSC 관련 설정
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['taeheonai.com', 'localhost:3000']
    },
  },
  
  // API 프록시 설정 - Railway 서비스들로 연결
  async rewrites() {
    return [
      // gri-service API 프록시 (Gateway)
      { 
        source: '/api/gri/:path*', 
        destination: 'https://taeheonai-production-2130.up.railway.app/gri/:path*' 
      },
      // auth-service API 프록시 (Gateway)
      { 
        source: '/api/auth/:path*', 
        destination: 'https://taeheonai-production-2130.up.railway.app/auth/:path*' 
      },
      // materiality-service API 프록시 (Gateway)
      { 
        source: '/api/v1/materiality/:path*', 
        destination: 'https://taeheonai-production-2130.up.railway.app/v1/materiality/:path*' 
      },

      // (domain) 그룹 폴더를 위한 rewrites
      {
        source: '/login',
        destination: '/auth/login'
      },
      {
        source: '/signup',
        destination: '/auth/signup'
      },
      {
        source: '/dashboard',
        destination: '/dashboard'
      },
      {
        source: '/chatbot',
        destination: '/chatbot'
      },
      {
        source: '/esrs',
        destination: '/esrs'
      },
      // GRI 페이지들은 Next.js 앱 라우터로 처리 (rewrite 불필요)
      // {
      //   source: '/gri',
      //   destination: '/gri'
      // },
      // {
      //   source: '/gri/intake',
      //   destination: '/gri/intake'
      // },
      // {
      //   source: '/gri/report',
      //   destination: '/gri/report'
      // },
      {
        source: '/materiality',
        destination: '/materiality'
      },
      // RSC 요청 처리
      {
        source: '/:path*/_rsc/:params*',
        destination: '/:path*/:params*'
      }
    ];
  },
};

export default withPWAConfig(nextConfig);
