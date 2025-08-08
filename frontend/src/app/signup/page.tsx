'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

type SignupFormState = {
  id: string;
  company_id: string;
  industry: string;
  email: string;
  name: string;
  age: string;
  auth_id: string;
  auth_pw: string;
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>({
    id: '',
    company_id: '',
    industry: '',
    email: '',
    name: '',
    age: '',
    auth_id: '',
    auth_pw: '',
  });
  const [submitted, setSubmitted] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    const payload = {
      id: form.id || undefined, // id가 비어있으면 undefined로 전송
      company_id: form.company_id,
      industry: form.industry,
      email: form.email,
      name: form.name,
      age: form.age,
      auth_id: form.auth_id,
      auth_pw: form.auth_pw,
    };

    setSubmitted(payload);
    alert(`회원가입 데이터 (JSON):\n${JSON.stringify(payload, null, 2)}`);

    // 백엔드 로깅 호출 (실패해도 UI는 계속 동작)
    try {
      // 환경 변수 또는 기본값 사용
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      console.log('API URL:', baseURL);
      console.log('Request payload:', payload);
      const response = await axios.post(`${baseURL}/v1/auth/signup`, payload);
      console.log('Signup successful:', response.data);
    } catch (err: any) {
      console.error('signup log post failed', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        }
      });
      setError(err.response?.data?.detail || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">회원가입</h1>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              로그인으로 이동
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">사용자 ID (id) - 선택사항</label>
              <input
                name="id"
                value={form.id}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 12345 (비워두면 자동 생성)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">회사 ID (company_id)</label>
              <input
                name="company_id"
                value={form.company_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: THN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">산업 분야 (industry)</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 제조, 금융"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">이메일 (email)</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">이름 (name)</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">나이 (age)</label>
                <input
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">아이디 (auth_id)</label>
                <input
                  name="auth_id"
                  value={form.auth_id}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="로그인에 사용할 아이디"
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
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium"
              >
                {loading ? '처리 중...' : '제출 (미저장)'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </form>

          {submitted && (
            <div className="px-6 pb-6">
              <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">제출 미리보기 (DB 저장 안 함)</h2>
                <pre className="text-xs text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-all">{JSON.stringify(submitted, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


