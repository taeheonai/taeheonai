import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 정적 파일/공개 경로는 우회
const PUBLIC_FILE = /\.(.*)$/;
const PUBLIC_PATHS = [
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/sw.js",
  "/workbox-8817a5e5.js"
];

// 공개 접근이 필요한 경로
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/signup"
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 정적 파일 및 공개 경로 체크
  const isPublic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    PUBLIC_FILE.test(pathname) ||
    PUBLIC_PATHS.includes(pathname);

  // 공개 라우트 체크
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (isPublic || isPublicRoute) {
    return NextResponse.next();
  }

  // 토큰 검증
  const token = req.cookies.get("token")?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

// 모든 경로를 검사하되, 위에서 예외 처리
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
