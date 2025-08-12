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
  // PWA 설정 강화
  sw: "sw.js",
  swDest: "public/sw.js",
});

export default withPWAConfig(nextConfig);
