'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postSignupPayload } from '@/lib/api';
import { SignupPayload } from '@/types/user';
import axios from 'axios';

// 데이터베이스 스키마에 맞춘 타입
interface Corporation {
  id: number;
  corp_code: string;
  companyname: string;  // 기업명 (데이터베이스 컬럼명과 일치)
  market: string;
  dart_code: string;
}

type SignupFormState = {
  id: string;
  company_name: string;     // 선택한 회사명(표시용)
  corporation_id: number | null;// 실제 저장할 FK
  industry: string;
  email: string;
  name: string;
  birth: string;            // 생년월일 (문자열)
  auth_id: string;
  auth_pw: string;
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>({
    id: '',
    company_name: '',
    corporation_id: null,
    industry: '',
    email: '',
    name: '',
    birth: '',
    auth_id: '',
    auth_pw: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [loadingCorporations, setLoadingCorporations] = useState(false);
  const router = useRouter();

  // 기업 목록
  const fetchCorporations = async () => {
    try {
      setLoadingCorporations(true);
      console.log('🚀 === 기업 목록 가져오기 시작 ===');
      
      // axios로 직접 API 호출 (올바른 Auth Service URL - HTTPS)
      let apiUrl = 'https://disciplined-imagination-production-df5c.up.railway.app/v1/corporations?limit=1000';
      
      // 🚨 URL 검증: HTTP가 포함되어 있는지 확인하고 HTTPS로 강제 변환
      if (apiUrl.includes('http://')) {
        console.error('❌ HTTP URL 감지! 강제로 HTTPS로 변환');
        apiUrl = apiUrl.replace('http://', 'https://');
        console.log('✅ 변환된 URL:', apiUrl);
      } else {
        console.log('✅ HTTPS URL 확인됨');
      }
      
      // 🚨 추가 검증: URL이 실제로 HTTPS인지 확인
      if (!apiUrl.startsWith('https://')) {
        console.error('❌ URL이 여전히 HTTPS가 아님! 강제 변환');
        apiUrl = apiUrl.replace(/^http:\/\//, 'https://');
        console.log('✅ 최종 변환된 URL:', apiUrl);
      }
      
      // 🚨 최종 URL 검증
      console.log('🔍 최종 API URL 검증:', apiUrl);
      if (apiUrl.startsWith('https://')) {
        console.log('✅ HTTPS URL 최종 확인 완료');
      } else {
        throw new Error(`URL이 여전히 안전하지 않음: ${apiUrl}`);
      }
      
      console.log('🔍 API 요청 URL:', apiUrl);
      
      // 🚨 axios 요청 전 최종 URL 검증
      const finalUrl = new URL(apiUrl);
      if (finalUrl.protocol !== 'https:') {
        throw new Error(`프로토콜이 안전하지 않음: ${finalUrl.protocol}`);
      }
      console.log('✅ URL 프로토콜 검증 완료:', finalUrl.protocol);
      
      const response = await axios.get(apiUrl, {
        // 🚨 추가 보안 설정
        timeout: 10000,
        validateStatus: (status) => status < 500, // 5xx 에러만 reject
      });
      console.log('🔍 API 응답 상태:', response.status, response.statusText);
      console.log('🔍 API 응답 헤더:', response.headers);
      
      const data = response.data;
      console.log('🔍 API 응답 데이터:', data);
      
      const list: Corporation[] = Array.isArray(data) ? data : (data.data ?? []);
      setCorporations(list);
      console.log('✅ 기업 목록 가져오기 성공:', list.length, '개');
      console.log('🚀 === 기업 목록 가져오기 완료 ===');
    } catch (e) {
      console.error('❌ 기업 목록 가져오기 오류:', e);
      
      // 🚨 더 자세한 에러 정보 출력
      if (e instanceof Error) {
        console.error('🔍 에러 타입:', e.constructor.name);
        console.error('🔍 에러 메시지:', e.message);
        console.error('🔍 에러 스택:', e.stack);
      }
      
      if (e && typeof e === 'object' && 'response' in e) {
        const axiosError = e as { response?: { status?: number; statusText?: string; data?: { detail?: string } } };
        console.error('🔍 HTTP 상태:', axiosError.response?.status);
        console.error('🔍 에러 메시지:', axiosError.response?.data);
      }
      
      // 🚨 네트워크 에러 특별 처리
      if (e && typeof e === 'object' && 'code' in e) {
        const networkError = e as { code?: string; message?: string };
        console.error('🔍 네트워크 에러 코드:', networkError.code);
        console.error('🔍 네트워크 에러 메시지:', networkError.message);
      }
      
      console.error('🚨 === 기업 목록 가져오기 실패 ===');
    } finally {
      setLoadingCorporations(false);
    }
  };

  useEffect(() => {
    fetchCorporations();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // 회사명 선택 시 corporation_id 동기화 (id를 FK로 저장)
    if (name === 'company_name') {
      const selected = corporations.find(c => c.companyname === value);
      setForm((prev) => ({ ...prev, corporation_id: selected ? selected.id : null }));
      // 선택된 회사의 industry를 기본값으로 넣고 싶다면 아래 주석 해제
      // setForm((prev) => ({ ...prev, industry: selected?.industry ?? '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 간단 검증
    if (!form.auth_id.trim() || !form.auth_pw.trim()) {
      setError('아이디와 비밀번호를 입력하세요.');
      setLoading(false);
      return;
    }
    if (!form.corporation_id) {
      setError('기업명을 선택하세요.');
      setLoading(false);
      return;
    }

    // birth는 문자열로 유지

    const payload: SignupPayload = {
      corporation_id: form.corporation_id,          // 숫자 FK
      industry: form.industry || null,
      email: form.email || null,
      name: form.name || null,
      birth: form.birth || null,                   // 문자열
      auth_id: form.auth_id,
      auth_pw: form.auth_pw,
    };

    try {
      const response = await postSignupPayload(payload);
      console.log('Signup successful:', response.data);

      if (response.data) {
        const userInfo = {
          auth_id: form.auth_id,
          name: form.name || form.auth_id,
          email: form.email,
          corporation_id: form.corporation_id,
          industry: form.industry,
          birth: form.birth,
        };
        localStorage.setItem('user', JSON.stringify(userInfo));
        alert('회원가입 성공! 자동으로 로그인되었습니다.');
        router.push('/');
      }
    } catch (err: unknown) {
      console.error('signup log post failed', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; statusText?: string; data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || '회원가입 중 오류가 발생했습니다.');
      } else {
        setError('회원가입 중 오류가 발생했습니다.');
      }
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
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">기업명 (company_name) *</label>
              <select
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading || loadingCorporations}
              >
                <option value="">
                  {loadingCorporations ? '기업 목록 로딩 중...' : '기업을 선택하세요'}
                </option>
                {corporations.map((corp) => (
                  <option key={corp.id} value={corp.companyname}>
                    {corp.companyname} ({corp.corp_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">기업 ID (company_id)</label>
              <div className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-3 py-2">
                {form.corporation_id ? `(${form.corporation_id})` : '(기업명 선택 시 자동 설정)'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">산업 분야 (industry)</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 제조, 금융"
                disabled={loading}
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
                disabled={loading}
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
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">생년월일 (birth)</label>
                <input
                  name="birth"
                  value={form.birth}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 1990-01-01"
                  disabled={loading}
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
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium"
              >
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
