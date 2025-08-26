import { NextResponse } from 'next/server';

// CORS preflight 요청 처리
export async function OPTIONS() {
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
    console.log('🚀 === 프록시 라우트 시작 ===');
    console.log('🔍 요청 URL:', request.url);
    console.log('🔍 요청 메서드:', request.method);
    console.log('🔍 요청 헤더:', Object.fromEntries(request.headers.entries()));
    
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ?? '1000';
    console.log('🔍 limit 파라미터:', limit);

    // 🚨 임시 해결책: Auth Service를 직접 호출
    const base = process.env.API_BASE_URL || 'https://disciplined-imagination-production-df5c.up.railway.app';
    console.log('🔍 API_BASE_URL 환경변수:', base);
    console.log('🔍 사용할 base URL:', base);
    
    if (!base) {
      console.error('❌ API_BASE_URL 환경변수가 설정되지 않음');
      return NextResponse.json(
        { detail: 'API_BASE_URL not configured' }, 
        { status: 500 }
      );
    }

    // Auth Service를 직접 호출 (Gateway 우회)
    let url = `${base}/v1/corporations/?limit=${encodeURIComponent(limit)}`;
    console.log('🚀 프록시 요청:', url);
    
    // 🚨 URL 검증: HTTP가 포함되어 있는지 확인
    if (url.includes('http://')) {
      console.error('❌ HTTP URL 감지! 강제로 HTTPS로 변환');
      url = url.replace('http://', 'https://');
      console.log('✅ 변환된 URL:', url);
    } else {
      console.log('✅ HTTPS URL 확인됨');
    }
    
    console.log('🔍 최종 요청 URL:', url);

    console.log('🔍 fetch 요청 시작...');
    const response = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' }, 
      cache: 'no-store' 
    });
    console.log('🔍 fetch 응답 수신:', response.status, response.statusText);
    console.log('🔍 응답 헤더:', Object.fromEntries(response.headers.entries()));

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
    
    console.log('✅ 프록시 응답 생성 완료');
    console.log('🚀 === 프록시 라우트 완료 ===');
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('❌ 프록시 오류:', error);
    console.error('🚨 === 프록시 라우트 오류 ===');
    return NextResponse.json(
      { detail: 'Proxy error', error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
