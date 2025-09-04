import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ManifestDebug from "./ManifestDebug";
// import PWAInstallPrompt from "@/components/PWAInstallPrompt";
// import PWAStatus from "@/components/PWAStatus";
// import PWAInstall from "@/components/PWAInstall";
import { AuthProvider } from "@/contexts/AuthContext";
import SessionInitializer from "@/components/SessionInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaeheonAI - 중대성평가 GRI Report 자동화 플랫폼",
  description: "ESG 경영의 핵심, 중대성 평가를 자동화하고 GRI Report를 효율적으로 생성하는 통합 플랫폼",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaeheonAI",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaeheonAI" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ErrorBoundary>
            <SessionInitializer />
            <ManifestDebug />
            {/* <PWAStatus /> */}
            {children}
            {/* <PWAInstallPrompt /> */}
            {/* <PWAInstall /> */}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
