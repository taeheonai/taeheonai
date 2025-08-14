'use client';

import { useState, useEffect } from 'react';
import { postLoginPayload } from '@/lib/api';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // 환경 정보 수집
    const info = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      RAILWAY: process.env.RAILWAY,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      timestamp: new Date().toISOString(),
    };
    setDebugInfo(info);
  }, []);

  const testAPI = async () => {
    try {
      setTestResult('테스트 중...');
      const response = await postLoginPayload({
        auth_id: 'test',
        auth_pw: 'test'
      });
      setTestResult(`✅ 성공: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error: any) {
      setTestResult(`❌ 실패: ${error.message || error.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 API 디버그 페이지</h1>
        
        {/* 환경 정보 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">환경 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(debugInfo).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-3 rounded">
                <div className="font-medium text-gray-700">{key}</div>
                <div className="text-sm text-gray-600 break-all">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API 테스트 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API 테스트</h2>
          <button
            onClick={testAPI}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            로그인 API 테스트
          </button>
          {testResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>

        {/* 로컬 스토리지 정보 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">로컬 스토리지</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Token: </span>
              <span className="text-sm text-gray-600">
                {typeof window !== 'undefined' ? localStorage.getItem('token') || '없음' : 'SSR'}
              </span>
            </div>
            <div>
              <span className="font-medium">User: </span>
              <span className="text-sm text-gray-600">
                {typeof window !== 'undefined' ? localStorage.getItem('user') || '없음' : 'SSR'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
