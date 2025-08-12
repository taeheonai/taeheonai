import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // public 폴더의 manifest.json 파일 확인
    const publicPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestExists = fs.existsSync(publicPath);
    
    // .next 폴더의 빌드 결과 확인
    const nextPath = path.join(process.cwd(), '.next', 'static', 'manifest.json');
    const nextManifestExists = fs.existsSync(nextPath);
    
    // 현재 작업 디렉토리 정보
    const cwd = process.cwd();
    const publicDir = path.join(cwd, 'public');
    const publicFiles = fs.readdirSync(publicDir);
    
    // manifest.json 파일 내용 읽기
    let manifestContent = null;
    if (manifestExists) {
      try {
        manifestContent = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      } catch (e) {
        manifestContent = `Error reading manifest: ${e}`;
      }
    }
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      debug: {
        cwd,
        publicDir,
        publicFiles,
        manifestExists,
        nextManifestExists,
        manifestPath: publicPath,
        nextManifestPath: nextPath,
        manifestContent,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          VERCEL_ENV: process.env.VERCEL_ENV,
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Manifest-Debug': 'true'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'X-Manifest-Debug': 'true'
      }
    });
  }
}
