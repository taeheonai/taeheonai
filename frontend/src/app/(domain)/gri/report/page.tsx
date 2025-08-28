'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useGriStore } from '@/store/useGriStore';

export default function GriReportPage() {
  const user = useAuthStore((s) => s.user);
  const { sessionKey, polishedByIndex, setPolished } = useGriStore();
  const [indices, setIndices] = useState<string[]>([]); // 보고서에 담을 index 리스트
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 예: intake에서 선택된 item만 혹은 카테고리 전체
    setIndices(Object.keys(polishedByIndex));
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation user={user} />
          <div className="flex items-center justify-center h-[calc(100vh-100px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">보고서 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">GRI 보고서</h1>
            <p className="text-gray-600 mt-2">작성된 GRI 보고서 내용입니다.</p>
          </div>

          {indices.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 작성된 보고서가 없습니다</h3>
              <p className="text-gray-600">GRI Intake 페이지에서 답변을 작성하고 저장해주세요.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {indices.map((idx) => (
                <section key={idx} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">인덱스 {idx}</h2>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800">
                      {polishedByIndex[idx] || '윤문 결과 로딩 중...'}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}