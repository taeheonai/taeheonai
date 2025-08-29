'use client';

import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';

export default function GriPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">GRI Management</h1>
            <p className="text-xl text-gray-600">
              GRI 인덱스 관리 및 답변 작성 시스템
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* MG Index Management */}
            <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => handleNavigate('/mg')}>
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">MG Index Management</h3>
                <p className="text-gray-600 mb-4">
                  선택된 IssuePool들의 GRI 인덱스를 확인하고 관리하세요
                </p>
                <div className="inline-flex items-center text-blue-600 font-medium">
                  <span>바로가기</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* GRI Intake */}
            <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => handleNavigate('/gri/intake')}>
              <div className="text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">GRI Intake</h3>
                <p className="text-gray-600 mb-4">
                  GRI 항목별 답변을 작성하고 저장하세요
                </p>
                <div className="inline-flex items-center text-blue-600 font-medium">
                  <span>바로가기</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 추가 정보 */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">💡 사용 가이드</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-2">MG Index Management:</p>
                <ul className="space-y-1">
                  <li>• IssuePool 선택 및 GRI 인덱스 확인</li>
                  <li>• 인덱스별 등급 및 빈도 관리</li>
                  <li>• 데이터 분석 및 통계</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">GRI Intake:</p>
                <ul className="space-y-1">
                  <li>• GRI 항목별 답변 작성</li>
                  <li>• 답변 저장 및 관리</li>
                  <li>• 보고서 생성 준비</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
