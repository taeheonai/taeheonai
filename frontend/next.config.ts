import type { NextConfig } from "next";
// @ts-ignore
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // PWA 설정 강화
  experimental: {
    // 정적 파일 서빙 개선
    optimizePackageImports: ['next-pwa'],
  },
  // 정적 파일 서빙 디버깅
  output: 'standalone',
  // 정적 파일 경로 확인
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  // 디버그 로그 활성화
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Vercel에서 manifest.json 서빙을 위한 설정
  runtimeCaching: [],
  // PWA 설정 강화
  sw: "sw.js",
  swDest: "public/sw.js",
  // manifest 파일 경로 명시적 지정
  manifest: {
    name: "TaeheonAI",
    short_name: "TaeheonAI",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  // 디버그 모드 활성화
  debug: true,
  // 빌드 로그 상세화
  buildExcludes: [/middleware-manifest\.json$/, /\.map$/],
});

export default withPWAConfig(nextConfig);
