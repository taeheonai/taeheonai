'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 로그인 상태 확인
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      // 로그인되지 않은 경우 홈페이지로 리다이렉트
      router.push('/');
      return;
    }
    
    try {
      setUserInfo(JSON.parse(user));
    } catch (e) {
      console.error('사용자 정보 파싱 오류:', e);
      router.push('/');
      return;
    }
    
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">대시보드</h1>
            <p className="text-lg text-gray-600 mt-2">
              안녕하세요, {userInfo?.name || userInfo?.auth_id || '사용자'}님!
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              홈으로
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">사용자 정보</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">아이디</label>
              <p className="text-lg text-gray-900">{userInfo?.auth_id || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">이름</label>
              <p className="text-lg text-gray-900">{userInfo?.name || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">이메일</label>
              <p className="text-lg text-gray-900">{userInfo?.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">회사 ID</label>
              <p className="text-lg text-gray-900">{userInfo?.company_id || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">산업 분야</label>
              <p className="text-lg text-gray-900">{userInfo?.industry || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">나이</label>
              <p className="text-lg text-gray-900">{userInfo?.age || '-'}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ESG 분석</h3>
            <p className="text-gray-600 mb-4">환경, 사회, 지배구조를 종합적으로 분석하여 지속가능성을 평가합니다.</p>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              분석 시작하기
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI 인사이트</h3>
            <p className="text-gray-600 mb-4">머신러닝을 활용하여 데이터에서 숨겨진 패턴과 인사이트를 발견합니다.</p>
            <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              인사이트 보기
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">리포트 생성</h3>
            <p className="text-gray-600 mb-4">자동화된 리포트 생성으로 시간을 절약하고 일관된 품질을 보장합니다.</p>
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              리포트 생성
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">최근 활동</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">로그인 완료</span>
              <span className="text-sm text-gray-400 ml-auto">방금 전</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">회원가입 완료</span>
              <span className="text-sm text-gray-400 ml-auto">방금 전</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
