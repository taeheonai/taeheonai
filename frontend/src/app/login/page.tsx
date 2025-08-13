'use client';

import { useState } from 'react';
import Link from 'next/link';
import { postLoginPayload } from '@/lib/api';

type LoginFormState = {
  auth_id: string;
  auth_pw: string;
};

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({ auth_id: '', auth_pw: '' });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // 환경변수 상태 확인 로깅 추가
    console.log('🔍 === 환경변수 상태 확인 ===');
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_ENVIRONMENT:', process.env.NEXT_PUBLIC_ENVIRONMENT);
    console.log('🔍 === 환경변수 상태 끝 ===');

    // 간단한 클라이언트 측 검증 (DB 저장/호출 없음)
    if (!form.auth_id.trim() || !form.auth_pw.trim()) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }
    // JSON 생성 및 알림
    const payload = {
      auth_id: form.auth_id,
      auth_pw: form.auth_pw,
    };
    
    // 브라우저 alert와 Docker 로그 모두에서 확인 가능
    const alertMessage = `로그인 데이터 (JSON):\n${JSON.stringify(payload, null, 2)}`;
    alert(alertMessage);
    console.log('=== 로그인 Alert 데이터 ===');
    console.log(alertMessage);
    console.log('=== Alert 데이터 끝 ===');
    
    try {
      // api.ts의 함수 사용
      const response = await postLoginPayload(payload);
      console.log('Login successful:', response.data);
    } catch (err) {
      console.error('login log post failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">로그인</h1>
            <Link href="/signup" className="text-sm text-blue-600 hover:underline">
              회원가입으로 이동
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">아이디 (auth_id)</label>
              <input
                name="auth_id"
                value={form.auth_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="아이디"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">비밀번호 (auth_pw)</label>
              <input
                type="password"
                name="auth_pw"
                value={form.auth_pw}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                로그인
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


