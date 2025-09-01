'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
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
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">
            {user?.corporation_name || user?.corporation_id}의 ESG 관리 현황을 한눈에 확인하세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 px-4 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
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

          <div className="bg-white overflow-hidden shadow rounded-lg">
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

          <div className="bg-white overflow-hidden shadow rounded-lg">
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

          <div className="bg-white overflow-hidden shadow rounded-lg">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-0">
          {/* 중대성 평가 결과 */}
          <div className="bg-white shadow rounded-lg">
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
          <div className="bg-white shadow rounded-lg">
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

        {/* 최근 활동 */}
        <div className="mt-8 px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg">
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
      </div>
      </div>
    </ProtectedRoute>
  );
}
