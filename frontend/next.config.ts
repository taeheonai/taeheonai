import type { NextConfig } from "next";
import withPWA from "next-pwa";

// PWA 설정 - 자동 생성(GenerateSW) 방식
const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // dev에서는 비활성화
  register: true,
  skipWaiting: true,
  // runtimeCaching 같은 커스텀은 지금은 넣지 말고, 빌드 성공 후 점진 추가
});

// Vercel 배포 환경인지 확인
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

const nextConfig: NextConfig = {
  // 로컬에서는 standalone 비활성화, Vercel 배포일 때만 활성화
  ...(isVercel ? { output: 'standalone' as const } : {}),
  
  // API 프록시 설정 - Railway 게이트웨이로 연결
  async rewrites() {
    return [
      // /api 프리픽스는 Next의 Serverless Functions와 충돌할 수 있어
      // /backend 같은 별도 프리픽스를 권장
      { 
        source: '/backend/:path*', 
        destination: 'https://taeheonai-production-2130.up.railway.app/:path*' 
      },
    ];
  },
  
  // trailingSlash 설정
  trailingSlash: false,
};

export default withPWAConfig(nextConfig);
