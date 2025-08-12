import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaeheonAI",
  description: "A Next.js PWA application with TypeScript, React, Zustand, and Axios",
  manifest: "/manifest.json",
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
  themeColor: "#000000",
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
    <html lang="en">
      <head>
        <link 
          rel="manifest" 
          href="/manifest.json" 
          onError={(e) => {
            console.error("❌ Manifest loading failed:", e);
            console.error("🔍 Debug info: Check /api/debug-manifest for details");
          }}
          onLoad={() => {
            console.log("✅ Manifest loaded successfully");
          }}
        />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaeheonAI" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Manifest 디버깅 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log("🔍 Manifest debugging enabled");
              console.log("📁 Current URL:", window.location.href);
              console.log("📄 Manifest path:", "/manifest.json");
              
              // Manifest 로딩 테스트
              fetch('/manifest.json')
                .then(response => {
                  console.log("✅ Manifest fetch response:", response.status, response.statusText);
                  return response.text();
                })
                .then(text => {
                  console.log("📄 Manifest content length:", text.length);
                  try {
                    const manifest = JSON.parse(text);
                    console.log("✅ Manifest parsed successfully:", manifest.name);
                  } catch (e) {
                    console.error("❌ Manifest JSON parse error:", e);
                  }
                })
                .catch(error => {
                  console.error("❌ Manifest fetch error:", error);
                  console.log("🔍 Debug endpoint available at: /api/debug-manifest");
                });
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
