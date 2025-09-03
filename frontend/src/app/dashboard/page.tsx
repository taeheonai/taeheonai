'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavigationTabs from '@/components/NavigationTabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface MaterialityResult {
  id: string;
  category: string;
  score: number;
  status: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

interface GRIReportResult {
  id: string;
  category: string;
  completionRate: number;
  totalQuestions: number;
  answeredQuestions: number;
  lastUpdated: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [materialityResults, setMaterialityResults] = useState<MaterialityResult[]>([]);
  const [griResults, setGriResults] = useState<GRIReportResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      try {
        // 중대성 평가 결과 가져오기 (실제 API 연동 시 수정)
        setMaterialityResults([
          {
            id: '1',
            category: '환경 (Environmental)',
            score: 85,
            status: 'high',
            lastUpdated: '2024-01-15'
          },
          {
            id: '2',
            category: '사회 (Social)',
            score: 72,
            status: 'medium',
            lastUpdated: '2024-01-14'
          },
          {
            id: '3',
            category: '거버넌스 (Governance)',
            score: 91,
            status: 'high',
            lastUpdated: '2024-01-13'
          }
        ]);

        // GRI 보고서 결과 가져오기 (실제 API 연동 시 수정)
        setGriResults([
          {
            id: '1',
            category: 'GRI 2 - General Disclosures',
            completionRate: 75,
            totalQuestions: 40,
            answeredQuestions: 30,
            lastUpdated: '2024-01-15'
          },
          {
            id: '2',
            category: 'GRI 3 - Material Topics',
            completionRate: 45,
            totalQuestions: 20,
            answeredQuestions: 9,
            lastUpdated: '2024-01-14'
          },
          {
            id: '3',
            category: 'GRI 201 - Economic Performance',
            completionRate: 90,
            totalQuestions: 15,
            answeredQuestions: 13,
            lastUpdated: '2024-01-13'
          }
        ]);

      } catch (error) {
        console.error('데이터 로딩 중 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleButtonClick = (action: string) => {
    console.log(`${action} 버튼 클릭됨`);
    // 여기에 각 버튼별 동작 로직 추가
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {/* 상단 내비게이션 바 */}
        <NavigationTabs />

        {/* 메인 콘텐츠 영역 */}
        <div className="max-w-7xl mx-auto p-6 pt-20">
          {/* 헤더 섹션 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              기업 지속가능성 관리
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {user?.companyname || user?.corporation_id || '기업'}의 ESG 경영 현황을 한눈에 확인하고 관리할 수 있는 통합 대시보드입니다
            </p>
          </div>

          {/* 통계 카드 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">M</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        중대성 평가 완료
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {materialityResults.length}개
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">G</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        GRI 보고서 진행률
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {Math.round(griResults.reduce((acc, curr) => acc + curr.completionRate, 0) / griResults.length)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">E</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ESRS 준비도
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        65%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">R</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        보고서 생성
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        2개
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* 상세 결과 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 중대성 평가 결과 */}
          <div className="bg-white shadow-lg rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">중대성 평가 결과</h3>
              <p className="mt-1 text-sm text-gray-500">
                최근 업데이트된 중대성 평가 결과입니다.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {materialityResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{result.category}</h4>
                      <p className="text-sm text-gray-500">점수: {result.score}/100</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                        {result.status === 'high' ? '높음' : result.status === 'medium' ? '보통' : '낮음'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(result.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href="/materiality"
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                >
                  중대성 평가 상세보기
                </Link>
              </div>
            </div>
          </div>

          {/* GRI 보고서 작성 결과 */}
          <div className="bg-white shadow-lg rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">GRI 보고서 작성 현황</h3>
              <p className="mt-1 text-sm text-gray-500">
                GRI 표준별 보고서 작성 진행률입니다.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {griResults.map((result) => (
                  <div key={result.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{result.category}</h4>
                      <span className={`text-sm font-medium ${getCompletionColor(result.completionRate)}`}>
                        {result.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          result.completionRate >= 80 ? 'bg-green-500' :
                          result.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.completionRate}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {result.answeredQuestions}/{result.totalQuestions} 질문 완료
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(result.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href="/gri/intake"
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 bg-green-50 hover:bg-green-100"
                >
                  GRI 보고서 계속 작성하기
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 대시보드 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* 기업 정보 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">기업 정보</h3>
                  <p className="text-sm text-gray-500">기업 기본 정보 및 프로필</p>
                </div>
              </div>
              <button
                onClick={() => handleButtonClick('기업명')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                기업 정보 확인
              </button>
            </div>
          </div>

          {/* 재무 정보 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">재무 정보</h3>
                  <p className="text-sm text-gray-500">재무상태표 및 손익계산서</p>
                </div>
              </div>
              <button
                onClick={() => handleButtonClick('재무정보')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                재무 정보 확인
              </button>
            </div>
          </div>

          {/* 중대성 평가 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">중대성 평가</h3>
                  <p className="text-sm text-gray-500">ESG 이슈 중요도 분석 결과</p>
                </div>
              </div>
              <button
                onClick={() => handleButtonClick('중대성평가')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                평가 결과 확인
              </button>
            </div>
          </div>

          {/* GRI 보고서 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">GRI 보고서</h3>
                  <p className="text-sm text-gray-500">지속가능성 보고서 작성 결과</p>
                </div>
              </div>
              <button
                onClick={() => handleButtonClick('GRI보고서')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                보고서 확인
              </button>
            </div>
          </div>

          {/* TCFD 보고서 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">TCFD 보고서</h3>
                  <p className="text-sm text-gray-500">기후 관련 재무정보 보고서</p>
                </div>
              </div>
              <button
                onClick={() => handleButtonClick('TCFD보고서')}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                보고서 확인
              </button>
            </div>
          </div>

          {/* 통계 요약 카드 */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden md:col-span-2 lg:col-span-1">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">전체 현황</h3>
                  <p className="text-sm text-gray-500">ESG 관리 현황 요약</p>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">완료된 평가</span>
                  <span className="text-sm font-semibold text-green-600">3/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">보고서 생성</span>
                  <span className="text-sm font-semibold text-blue-600">2/3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">최근 업데이트</span>
                  <span className="text-sm font-semibold text-gray-600">2일 전</span>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                전체 현황 보기
              </button>
            </div>
          </div>
        </div>

        {/* 최근 활동 섹션 */}
        <div className="mt-8">
          <div className="bg-white shadow-lg rounded-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">GRI 2-1 조직 개요 답변 저장 완료</span>
                  <span className="text-xs text-gray-500">2시간 전</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">환경 중대성 평가 업데이트</span>
                  <span className="text-xs text-gray-500">1일 전</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">ESRS E1 기후변화 섹션 작성 시작</span>
                  <span className="text-xs text-gray-500">2일 전</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 안내 섹션 */}
        <div className="mt-16 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              🚀 ESG 경영을 위한 다음 단계
            </h3>
            <p className="text-gray-600 mb-6">
              각 섹션을 클릭하여 상세 정보를 확인하고, ESG 경영의 핵심 지표들을 체계적으로 관리하세요.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                완료됨
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                진행중
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                대기중
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
