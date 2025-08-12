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
  // manifest 파일 경로 명시
  manifest: {
    name: "TaeheonAI",
    short_name: "TaeheonAI",
    description: "A Next.js PWA application with TypeScript, React, Zustand, and Axios",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary"
  }
});

export default withPWAConfig(nextConfig);
