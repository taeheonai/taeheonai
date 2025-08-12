import type { NextConfig } from "next";
// @ts-ignore
import withPWA from "next-pwa";

const nextConfig: NextConfig = {};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Vercel에서 manifest.json 서빙을 위한 설정
  runtimeCaching: [],
  buildExcludes: [/middleware-manifest\.json$/],
  // manifest 설정을 올바른 위치로 이동
  swDest: "public/sw.js",
  // manifest는 별도로 설정하지 않음 - next-pwa가 자동 생성
});

export default withPWAConfig(nextConfig);
