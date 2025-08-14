'use client';

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useState, useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // 로컬 스토리지에서 로그인 상태 확인
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsLoggedIn(true);
      try {
        setUserInfo(JSON.parse(user));
      } catch (e) {
        console.error('사용자 정보 파싱 오류:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  return (
    <main className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Login Status */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TaeheonAI</h1>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  안녕하세요, {userInfo?.name || userInfo?.auth_id || '사용자'}님!
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            TaeheonAI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            지속가능 경영을 위한 AI 기반 솔루션
          </p>
          <div className="flex justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                대시보드로 이동
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  시작하기
                </Link>
                <Link
                  href="/signup"
                  className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ESG 분석</h3>
            <p className="text-gray-600">환경, 사회, 지배구조를 종합적으로 분석하여 지속가능성을 평가합니다.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI 기반 인사이트</h3>
            <p className="text-gray-600">머신러닝을 활용하여 데이터에서 숨겨진 패턴과 인사이트를 발견합니다.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">리포트 생성</h3>
            <p className="text-gray-600">자동화된 리포트 생성으로 시간을 절약하고 일관된 품질을 보장합니다.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            지속가능한 미래를 위한 첫걸음
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            TaeheonAI와 함께 ESG 경영의 새로운 패러다임을 만들어가세요.
          </p>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              대시보드로 이동
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              무료 체험 시작하기
            </Link>
          )}
        </div>

        {/* Login Status Debug */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">🔍 개발자 디버그 정보</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div>로그인 상태: {isLoggedIn ? '✅ 로그인됨' : '❌ 로그인 안됨'}</div>
              {userInfo && (
                <div>사용자 정보: {JSON.stringify(userInfo, null, 2)}</div>
              )}
              <div>API URL: {process.env.NEXT_PUBLIC_API_URL || '설정되지 않음'}</div>
              <div>환경: {process.env.NODE_ENV}</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
