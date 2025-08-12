import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "TaeheonAI",
    short_name: "TaeheonAI",
    description: "A Next.js PWA application with TypeScript, React, Zustand, and Axios",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
}
