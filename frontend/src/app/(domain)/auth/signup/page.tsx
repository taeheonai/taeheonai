'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postSignupPayload, fetchCorporations, searchCorporations } from '@/lib/api';
import { SignupPayload } from '@/types/user';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Corporation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const router = useRouter();

  // 기업 목록 (초기 로딩용)
  const fetchCorporationsData = async () => {
    try {
      setLoadingCorporations(true);
      console.log('🚀 === 기업 목록 가져오기 시작 ===');
      
      // 🚨 api.ts의 fetchCorporations 함수 사용 (일관성 유지)
      const response = await fetchCorporations(3000);  // 3000개 기업 가져오기
      
      console.log('🔍 API 응답 상태:', response.status, response.statusText);
      console.log('🔍 API 응답 헤더:', response.headers);
      
      const data = response.data;
      console.log('🔍 API 응답 데이터:', data);
      
      // 🚨 응답 데이터 구조 분석 및 처리
      let list: Corporation[] = [];
      
      if (Array.isArray(data)) {
        // 직접 배열인 경우
        list = data;
        console.log('✅ 직접 배열 응답 감지');
      } else if (data && typeof data === 'object' && 'data' in data) {
        // { data: [...] } 구조인 경우
        list = Array.isArray(data.data) ? data.data : [];
        console.log('✅ data 객체 응답 감지');
      } else if (data && typeof data === 'object' && 'success' in data) {
        // { success: true, data: [...] } 구조인 경우
        if (data.success && data.data) {
          list = Array.isArray(data.data) ? data.data : [];
          console.log('✅ success 객체 응답 감지');
        }
      }
      
      console.log('🔍 파싱된 기업 목록:', list);
      console.log('🔍 기업 목록 길이:', list.length);
      
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
        console.error('🔍 에러 상태 텍스트:', axiosError.response?.statusText);
      }
      
      // 🚨 네트워크 에러 특별 처리
      if (e && typeof e === 'object' && 'code' in e) {
        const networkError = e as { code?: string; message?: string };
        console.error('🔍 네트워크 에러 코드:', networkError.code);
        console.error('🔍 네트워크 에러 메시지:', networkError.message);
      }
      
      // 🚨 CORS 오류 특별 처리
      if (e && typeof e === 'object' && 'message' in e) {
        const errorMessage = (e as { message?: string }).message;
        if (typeof errorMessage === 'string' && errorMessage.includes('CORS')) {
          console.error('🚨 CORS 오류 감지! Gateway CORS 설정 확인 필요');
        }
        if (typeof errorMessage === 'string' && errorMessage.includes('Mixed Content')) {
          console.error('🚨 Mixed Content 오류 감지! HTTPS 강제 변환 필요');
        }
        }
      
      console.error('🚨 === 기업 목록 가져오기 실패 ===');
      
      // 🚨 502 에러 특별 처리 (Corporation Service 다운)
      if (e && typeof e === 'object' && 'response' in e) {
        const axiosError = e as { response?: { status?: number } };
        if (axiosError.response?.status === 502) {
          console.error('🚨 Corporation Service가 응답하지 않습니다. Railway 대시보드에서 서비스 상태를 확인하세요.');
          setError('기업 목록을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        // 🚨 500 에러 특별 처리 (Corporation Service 내부 에러)
        else if (axiosError.response?.status === 500) {
          console.error('🚨 Corporation Service에서 내부 에러가 발생했습니다. 서비스 로그를 확인하세요.');
          setError('기업 목록을 가져오는 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
      }
    } finally {
      setLoadingCorporations(false);
    }
  };

  // 기업 검색 함수
  const handleSearchCorporations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 기업 검색 시작:', query);
      
      const response = await searchCorporations(query, 20);
      const data = response.data;
      
      let results: Corporation[] = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data && typeof data === 'object' && 'data' in data) {
        results = Array.isArray(data.data) ? data.data : [];
      }
      
      console.log('🔍 검색 결과:', results);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (e) {
      console.error('❌ 기업 검색 오류:', e);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 입력 처리 (디바운싱)
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setForm(prev => ({ ...prev, company_name: value, corporation_id: null }));
    
    // 입력값이 변경되면 검색 결과 숨기기
    if (!value.trim()) {
      setShowSearchResults(false);
      return;
    }
    
    // 디바운싱: 300ms 후 검색 실행
    const timeoutId = setTimeout(() => {
      handleSearchCorporations(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  // 사용자가 직접 입력한 값 처리
  const handleDirectInput = (value: string) => {
    setSearchQuery(value);
    setForm(prev => ({ ...prev, company_name: value }));
    
    // 입력값이 변경되면 검색 결과 숨기기
    if (!value.trim()) {
      setShowSearchResults(false);
      return;
    }
    
    // 기존 기업 목록에서 검색
    const filteredResults = corporations.filter(corp => 
      corp.companyname.toLowerCase().includes(value.toLowerCase()) ||
      corp.corp_code.includes(value)
    );
    
    if (filteredResults.length > 0) {
      setSearchResults(filteredResults);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  useEffect(() => {
    fetchCorporationsData();
  }, []);

  // 외부 클릭 시 검색 결과 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  // 기업 선택 처리
  const handleCorporationSelect = (corporation: Corporation) => {
    setForm(prev => ({
      ...prev,
      company_name: corporation.companyname,
      corporation_id: corporation.id
    }));
    setSearchQuery(corporation.companyname);
    setShowSearchResults(false);
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

                         <div className="relative">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">기업명 (company_name) *</label>
               <div className="mt-1 relative search-container">
                                   <input
                    type="text"
                    name="company_name"
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 즉시 로컬 검색 (직접 입력)
                      handleDirectInput(value);
                      // API 검색도 함께 실행 (디바운싱)
                      handleSearchInputChange(value);
                    }}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="기업명을 입력하세요 (예: 삼성전자, 현대자동차)"
                    required
                    disabled={loading}
                  />
                 {isSearching && (
                   <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   </div>
                 )}
               </div>
               
                               {/* 검색 결과 드롭다운 */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600">
                      검색 결과: {searchResults.length}개
                    </div>
                    {searchResults.map((corp) => (
                      <div
                        key={corp.id}
                        onClick={() => handleCorporationSelect(corp)}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {corp.companyname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          코드: {corp.corp_code} | 시장: {corp.market || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
               
               {/* 검색 결과가 없을 때 */}
               {showSearchResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                 <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                   <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                     검색 결과가 없습니다
                   </div>
                 </div>
               )}
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
