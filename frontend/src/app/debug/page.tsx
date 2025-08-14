'use client';

import { useState, useEffect } from 'react';
import { postSignupPayload } from '@/lib/api';

interface DebugInfo {
  NODE_ENV?: string;
  VERCEL?: string | undefined;
  RAILWAY?: string | undefined;
  NEXT_PUBLIC_API_URL?: string | undefined;
  hostname: string;
  userAgent: string;
  timestamp: string;
}

interface AxiosErrorResponse {
  response?: {
    status?: number;
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    hostname: 'SSR',
    userAgent: 'SSR',
    timestamp: new Date().toISOString(),
  });
  const [testResult, setTestResult] = useState<string>('');
  const [signupResult, setSignupResult] = useState<string>('');
  const [gatewayStatus, setGatewayStatus] = useState<string>('');

  useEffect(() => {
    // 환경 정보 수집
    const info: DebugInfo = {
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

  const testGateway = async () => {
    try {
      setGatewayStatus('Gateway 상태 확인 중...');
      
      // 1. Health Check
      const healthResponse = await fetch('https://taeheonai-production-2130.up.railway.app/api/health');
      const healthData = await healthResponse.json();
      
      // 2. Auth 서비스 상태 확인
      const authResponse = await fetch('https://taeheonai-production-2130.up.railway.app/api/v1/auth/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      let authStatus = '알 수 없음';
      if (authResponse.ok) {
        const authData = await authResponse.json();
        authStatus = `정상 (${JSON.stringify(authData)})`;
      } else {
        authStatus = `오류: ${authResponse.status} ${authResponse.statusText}`;
      }
      
      setGatewayStatus(`
✅ Gateway Health: ${JSON.stringify(healthData, null, 2)}
🔐 Auth Service: ${authStatus}
      `.trim());
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        setGatewayStatus(`❌ Gateway 테스트 실패: ${error.message}`);
      } else {
        setGatewayStatus(`❌ Gateway 테스트 실패: ${String(error)}`);
      }
    }
  };

  const testAPI = async () => {
    try {
      setTestResult('테스트 중...');
      // 간단한 fetch 테스트
      const response = await fetch('https://taeheonai-production-2130.up.railway.app/api/health');
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ 성공: ${JSON.stringify(data, null, 2)}`);
      } else {
        setTestResult(`❌ HTTP 오류: ${response.status} ${response.statusText}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setTestResult(`❌ 실패: ${error.message}`);
      } else {
        setTestResult(`❌ 실패: ${String(error)}`);
      }
    }
  };

  const testSignup = async () => {
    try {
      setSignupResult('회원가입 테스트 중...');
      const testPayload = {
        auth_id: 'test_user_' + Date.now(),
        auth_pw: 'test123',
        company_id: 'TEST-001',
        industry: '테스트',
        email: 'test@example.com',
        name: '테스트사용자',
        age: '25'
      };
      
      console.log('🔍 회원가입 테스트 페이로드:', testPayload);
      console.log('🔍 API URL:', 'https://taeheonai-production-2130.up.railway.app/api/v1/auth/signup');
      
      const response = await postSignupPayload(testPayload);
      setSignupResult(`✅ 회원가입 성공: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error: unknown) {
      console.error('❌ 회원가입 테스트 오류:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosErrorResponse;
        const errorDetails = {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: `HTTP ${axiosError.response?.status} - ${JSON.stringify(axiosError.response?.data, null, 2)}`
        };
        
        setSignupResult(`❌ 회원가입 실패: ${errorDetails.message}`);
        console.error('❌ 에러 상세 정보:', errorDetails);
      } else if (error instanceof Error) {
        setSignupResult(`❌ 회원가입 실패: ${error.message}`);
      } else {
        setSignupResult(`❌ 회원가입 실패: ${String(error)}`);
      }
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

        {/* Gateway 상태 확인 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Gateway 상태 확인</h2>
          <button
            onClick={testGateway}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mb-4"
          >
            Gateway 상태 확인
          </button>
          {gatewayStatus && (
            <div className="p-3 bg-gray-50 rounded">
              <pre className="text-sm whitespace-pre-wrap">{gatewayStatus}</pre>
            </div>
          )}
        </div>

        {/* API 테스트 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API 테스트</h2>
          <div className="space-y-4">
            <div>
              <button
                onClick={testAPI}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
              >
                Gateway Health Check
              </button>
              {testResult && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
                </div>
              )}
            </div>
            
            <div>
              <button
                onClick={testSignup}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                회원가입 API 테스트
              </button>
              {signupResult && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <pre className="text-sm whitespace-pre-wrap">{signupResult}</pre>
                </div>
              )}
            </div>
          </div>
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
