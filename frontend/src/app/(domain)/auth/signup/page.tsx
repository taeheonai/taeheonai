'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postSignupPayload, fetchCorporations, searchCorporations } from '@/lib/api';
import { SignupPayload } from '@/types/user';

// 데이터베이스 스키마에 맞춘 타입
interface Corporation {
  id: number;
  corp_code: string;
  companyname: string;  // ✅ company_name → companyname (DB와 일치)
  market: string;
  dart_code: string;
}

// API 응답 데이터 타입
interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
  count?: number;
  total?: number;
}

type SignupFormState = {
  id: string;
  companyname: string;          // ✅ company_name → companyname
  corporation_id: number | null; // 실제 저장할 FK
  industry: string;
  email: string;
  name: string;
  birth: string;
  auth_id: string;
  auth_pw: string;
};

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>({
    id: '',
    companyname: '',
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

  // 기업 데이터 관련 상태
  const [corporations, setCorporations] = useState<Corporation[]>([]); // 로컬 목록(대량 프리페치)
  const [loadingCorporations, setLoadingCorporations] = useState(false);

  // 검색/타입어헤드 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Corporation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // ───────────────────────────────────────────────
  // 1) 초기 기업 목록 대량 프리로드 (로컬 필터용)
  // ───────────────────────────────────────────────
  const fetchCorporationsData = async () => {
    try {
      setLoadingCorporations(true);
      // fetchCorporations 가 매개변수 없이 정의되어 있어도, 인자가 무시되므로 3000 전달해도 안전
      const res = await fetchCorporations(3000); // 최대 3000개 요청 (백엔드 limit 처리 필요)
      const data = res.data;

      let list: Corporation[] = [];
      if (Array.isArray(data)) list = data;
      else if (data && typeof data === 'object') {
        const apiResponse = data as ApiResponse<Corporation[]>;
        if ('data' in apiResponse && Array.isArray(apiResponse.data)) {
          list = apiResponse.data;
        }
      }

      setCorporations(list);
    } catch (e) {
      console.error('기업 목록 프리로드 실패:', e);
    } finally {
      setLoadingCorporations(false);
    }
  };

  useEffect(() => {
    fetchCorporationsData();
  }, []);

  // ───────────────────────────────────────────────
  // 2) 디바운스 서버 검색 (입력할 때 자동)
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setActiveIndex(-1);
      return;
    }

    // 먼저 로컬 목록에서 즉시 필터하여 체감속도 개선
    const localFiltered = corporations.filter(c =>
      c.companyname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.corp_code.includes(searchQuery)
    );
    if (localFiltered.length) {
      setSearchResults(localFiltered.slice(0, 50)); // 미리보기 최대 50개
      setShowSearchResults(true);
      setActiveIndex(0);
    } else {
      setSearchResults([]);
      setShowSearchResults(true);
      setActiveIndex(-1);
    }

    // 300ms 후 서버 검색
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchCorporations(searchQuery, 50);
        const data = res.data;
        let list: Corporation[] = [];
        if (Array.isArray(data)) list = data;
        else if (data && typeof data === 'object') {
          const apiResponse = data as ApiResponse<Corporation[]>;
          if ('data' in apiResponse && Array.isArray(apiResponse.data)) {
            list = apiResponse.data;
          }
        }
        setSearchResults(list);
        setShowSearchResults(true);
        setActiveIndex(list.length ? 0 : -1);
      } catch (e) {
        // 서버 검색 실패 시 로컬 필터 결과만 유지
        console.warn('서버 검색 실패, 로컬 결과 유지:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery, corporations]);

  // ───────────────────────────────────────────────
  // 3) 외부 클릭 시 검색 목록 닫기
  // ───────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // ───────────────────────────────────────────────
  // 4) 폼/입력 처리
  // ───────────────────────────────────────────────
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // 다른 필드들은 그대로 두고, company_name만 별도로 처리
    if (name === 'companyname') {
      setSearchQuery(value);
      setForm((prev) => ({ ...prev, corporation_id: null })); // 입력이 바뀌면 FK 초기화
      setShowSearchResults(!!value.trim());
    }
  };

  const handleCorporationSelect = (corp: Corporation) => {
    setForm(prev => ({
      ...prev,
      companyname: corp.companyname,
      corporation_id: corp.id,
    }));
    setSearchQuery(corp.companyname);
    setShowSearchResults(false);
  };

  // ───────────────────────────────────────────────
  // 5) 제출
  // ───────────────────────────────────────────────
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 클라이언트 사이드 validation
    if (!form.auth_id.trim()) {
      setError('아이디를 입력하세요.');
      setLoading(false);
      return;
    }
    
    if (form.auth_id.trim().length < 3) {
      setError('아이디는 최소 3자 이상이어야 합니다.');
      setLoading(false);
      return;
    }
    
    if (!form.auth_pw.trim()) {
      setError('비밀번호를 입력하세요.');
      setLoading(false);
      return;
    }
    
    if (form.auth_pw.trim().length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      setLoading(false);
      return;
    }
    
    if (!form.corporation_id) {
      setError('기업명을 선택하세요.');
      setLoading(false);
      return;
    }

    const payload: SignupPayload = {
      companyname: form.companyname,        // ✅ company_name → companyname
      corporation_id: form.corporation_id,
      industry: form.industry || null,
      email: form.email || null,
      name: form.name || null,
      birth: form.birth || null,
      auth_id: form.auth_id,
      auth_pw: form.auth_pw,
    };

    try {
      const response = await postSignupPayload(payload);
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
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error?.response?.data?.detail || '회원가입 중 오류가 발생했습니다.');
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
            {/* 사용자 ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                사용자 ID (id) - 선택사항
              </label>
              <input
                name="id"
                value={form.id}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 12345 (비워두면 자동 생성)"
                disabled={loading}
              />
            </div>

            {/* 기업명 - 타입어헤드 */}
            <div className="relative" ref={containerRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                기업명 (company_name) * <span className="text-red-500">필수</span>
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  name="companyname"
                  value={searchQuery}
                  autoComplete="off"
                  onChange={handleChange}
                  onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                  onKeyDown={(e) => {
                    if (!showSearchResults) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveIndex((i) => Math.min(i + 1, searchResults.length - 1));
                      resultsRef.current?.scrollTo({ top: (activeIndex + 1) * 40 });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveIndex((i) => Math.max(i - 1, 0));
                      resultsRef.current?.scrollTo({ top: Math.max(activeIndex - 1, 0) * 40 });
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (activeIndex >= 0 && searchResults[activeIndex]) {
                        handleCorporationSelect(searchResults[activeIndex]);
                      }
                    } else if (e.key === 'Escape') {
                      setShowSearchResults(false);
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="기업명을 입력하세요 (예: 삼성전자, 현대자동차)"
                  required
                  disabled={loading}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                기업명을 입력하고 목록에서 선택해주세요
              </p>

              {showSearchResults && (
                <div
                  ref={resultsRef}
                  className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-72 overflow-y-auto"
                  role="listbox"
                  aria-label="기업 검색 결과"
                >
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600">
                    {isSearching ? '검색 중…' : `검색 결과: ${searchResults.length}개`}
                  </div>

                  {searchResults.length === 0 && !isSearching && (
                    <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                      검색 결과가 없습니다
                    </div>
                  )}

                  {searchResults.map((corp, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={corp.id}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleCorporationSelect(corp)}
                        className={`px-3 py-2 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0
                          ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {corp.companyname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          코드: {corp.corp_code} {corp.market ? `| 시장: ${corp.market}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 기업 ID 표시 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                기업 ID (company_id)
              </label>
              <div className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-3 py-2">
                {form.corporation_id ? `(${form.corporation_id})` : '(기업명 선택 시 자동 설정)'}
              </div>
            </div>

            {/* 산업/이메일/개인정보/계정정보 */}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  아이디 (auth_id) *
                </label>
                <input
                  name="auth_id"
                  value={form.auth_id}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="로그인에 사용할 아이디 (최소 3자)"
                  minLength={3}
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  최소 3자 이상 입력해주세요
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  비밀번호 (auth_pw) *
                </label>
                <input
                  type="password"
                  name="auth_pw"
                  value={form.auth_pw}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="•••••••• (최소 4자)"
                  minLength={4}
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  최소 4자 이상 입력해주세요
                </p>
              </div>
            </div>

            {/* 제출 */}
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

            {loadingCorporations && (
              <div className="mt-2 text-sm text-gray-500">
                기업 목록을 불러오는 중…
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
