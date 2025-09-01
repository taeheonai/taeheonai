'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useGriStore } from '@/store/useGriStore';
import { useSessionStore } from '@/store/sessionStore';
import { PolishResult } from '@/components/PolishResult';

export default function GriReportPage() {
  const { polishedByIndex, setPolished } = useGriStore();
  const { sessionKey } = useSessionStore(); // ✅ sessionStore에서 sessionKey 가져오기
  const [indices, setIndices] = useState<string[]>([]); // 보고서에 담을 index 리스트
  const [isLoading, setIsLoading] = useState(true);

  // 🔧 PolishResult 컴포넌트 타입 디버깅
  useEffect(() => {
    console.log('🔍 PolishResult type:', typeof PolishResult, PolishResult);
  }, []);

  // 🔧 Store 상태 검증 및 안전한 인덱스 설정
  useEffect(() => {
    if (polishedByIndex && typeof polishedByIndex === 'object') {
      const validIndices = Object.keys(polishedByIndex).filter(key => 
        key && typeof key === 'string' && key.trim() !== ''
      );
      setIndices(validIndices);
    } else {
      setIndices([]);
    }
  }, [polishedByIndex]);

  // 새로고침으로 비어있으면 서버에서 복구
  useEffect(() => {
    if (!sessionKey) return;
    
    const loadPolishedData = async () => {
      setIsLoading(true);
      try {
        // TODO: API 구현 후 복구 로직 추가
        setIsLoading(false);
      } catch (error) {
        console.error('윤문 데이터 로드 오류:', error);
        setIsLoading(false);
      }
    };

    loadPolishedData();
  }, [sessionKey, indices, polishedByIndex, setPolished]);

  // 🔧 Store 상태 디버깅
  useEffect(() => {
    console.log('🔍 GRI Store 상태:', { sessionKey, polishedByIndex, indices });
  }, [sessionKey, polishedByIndex, indices]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">윤문 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">GRI Report</h1>
            <p className="mt-2 text-gray-600">
              윤문된 GRI 인덱스들을 보고서 형태로 확인하세요.
            </p>
            {/* 세션 정보 디버깅용 (개발 완료 후 제거 가능) */}
            {sessionKey && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
                <p><strong>Session Key:</strong> {sessionKey.substring(0, 8)}...</p>
              </div>
            )}
          </div>

          {indices.length > 0 ? (
            <div className="space-y-6">
              {indices.map((index) => (
                <div key={index} className="bg-white rounded-lg shadow-md">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      GRI {index}
                    </h3>
                    <PolishResult 
                      sessionKey={sessionKey || ''} 
                      griIndex={index}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 윤문된 결과가 없습니다</h3>
              <p className="text-gray-500">
                GRI Intake 페이지에서 윤문을 실행한 후 다시 확인해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}