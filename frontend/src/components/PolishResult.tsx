'use client';

import { usePolishStore } from '@/store/polishStore';
import { useEffect } from 'react';

interface PolishResultProps {
  sessionKey: string;
  griIndex: string;
  showSaveHint?: boolean;
}

export const PolishResult: React.FC<PolishResultProps> = ({ sessionKey, griIndex, showSaveHint = false }) => {
  const { status, result, error, savedAt, fetchPolishResult } = usePolishStore((s) => ({
    status: s.status,
    result: s.result,
    error: s.error,
    savedAt: s.savedAt,
    fetchPolishResult: s.fetchPolishResult,
  }));

  useEffect(() => {
    if (sessionKey && griIndex) {
      fetchPolishResult(sessionKey, griIndex);
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">윤문 결과를 불러오는 중...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p>오류: {error}</p>
      </div>
    );
  }

  if (status !== 'success' || !result?.polished_text) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap">{result.polished_text}</div>
      </div>
      <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
        <div>
          {savedAt && (
            <p>저장 시간: {new Date(savedAt).toLocaleString()}</p>
          )}
          {result.meta?.model && <p>모델: {result.meta.model}</p>}
        </div>
        {showSaveHint && (
          <p className="text-blue-600">
            * 저장 후 GRI Report 페이지에서 확인할 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
};