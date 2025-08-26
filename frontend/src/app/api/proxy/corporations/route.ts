import { NextResponse } from 'next/server';

// CORS preflight 요청 처리
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ?? '1000';

    const base = process.env.API_BASE_URL;
    if (!base) {
      console.error('❌ API_BASE_URL 환경변수가 설정되지 않음');
      return NextResponse.json(
        { detail: 'API_BASE_URL not configured' }, 
        { status: 500 }
      );
    }

    const url = `${base}/api/v1/corporations/?limit=${encodeURIComponent(limit)}`;
    console.log('🚀 프록시 요청:', url);

    const response = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' }, 
      cache: 'no-store' 
    });

    if (!response.ok) {
      console.error('❌ 업스트림 API 오류:', response.status, response.statusText);
      return NextResponse.json(
        { detail: 'Upstream API failed', status: response.status }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 프록시 성공:', data.length, '개 기업 데이터');
    
    // CORS 헤더 추가
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('❌ 프록시 오류:', error);
    return NextResponse.json(
      { detail: 'Proxy error', error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
