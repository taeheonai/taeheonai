'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postLoginPayload } from '@/lib/api';

type LoginFormState = {
  auth_id: string;
  auth_pw: string;
};

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({ auth_id: '', auth_pw: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 환경변수 상태 확인 로깅 추가
    console.log('🔍 === 환경변수 상태 확인 ===');
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_ENVIRONMENT:', process.env.NEXT_PUBLIC_ENVIRONMENT);
    console.log('🔍 === 환경변수 상태 끝 ===');

    // 간단한 클라이언트 측 검증 (DB 저장/호출 없음)
    if (!form.auth_id.trim() || !form.auth_pw.trim()) {
      setError('아이디와 비밀번호를 입력하세요.');
      setLoading(false);
      return;
    }
    
    try {
      // api.ts의 함수 사용
      const response = await postLoginPayload(form);
      console.log('Login successful:', response.data);
      
      // 로그인 성공 시 사용자 정보와 토큰 저장
      if (response.data) {
        // 토큰이 있다면 저장
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
        }
        
        // 사용자 정보 저장
        const userInfo = {
          auth_id: form.auth_id,
          name: response.data.name || form.auth_id,
          email: response.data.email,
          company_id: response.data.company_id,
          industry: response.data.industry,
          age: response.data.age
        };
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        // 성공 메시지 표시
        alert('로그인 성공! 홈페이지로 이동합니다.');
        
        // 홈페이지로 리다이렉트
        router.push('/');
      }
    } catch (err: unknown) {
      console.error('login failed', err);
      
      // 에러 메시지 처리
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        if (axiosError.response?.data?.detail) {
          setError(axiosError.response.data.detail);
        } else {
          setError('로그인 중 오류가 발생했습니다.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


