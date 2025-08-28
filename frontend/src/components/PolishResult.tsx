'use client';

import { usePolishStore } from '@/store/polishStore';
import { useEffect, useCallback, useRef } from 'react';

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

  // 🔧 컴포넌트 마운트 상태 추적
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 🔧 무한 루프 방지: useCallback으로 함수 안정화
  const stableFetchPolishResult = useCallback(async () => {
    if (!isMounted.current || !sessionKey || !griIndex) return;
    
    try {
      await fetchPolishResult(sessionKey, griIndex);
    } catch (error) {
      // 🔧 컴포넌트가 언마운트된 경우 에러 무시
      if (isMounted.current) {
        console.error('윤문 결과 조회 실패:', error);
      }
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

  useEffect(() => {
    // 🔧 이미 결과가 있거나 로딩 중이면 API 호출하지 않음
    if (sessionKey && griIndex && status === 'idle' && !result && isMounted.current) {
      stableFetchPolishResult();
    }
  }, [sessionKey, griIndex, status, result, stableFetchPolishResult]);

  // 🔧 컴포넌트가 언마운트된 경우 아무것도 렌더링하지 않음
  if (!isMounted.current) {
    return null;
  }

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
        {/* 🔧 404 에러일 때 사용자 친화적 메시지 */}
        {error?.includes('404') && (
          <p className="text-sm mt-2">아직 윤문 결과가 없습니다. 윤문을 실행해주세요.</p>
        )}
      </div>
    );
  }

  if (status !== 'success' || !result?.polished_text) {
    return (
      <div className="p-4 bg-gray-50 text-gray-600 rounded-md">
        <p>윤문 결과가 없습니다. 윤문을 실행해주세요.</p>
      </div>
    );
  }

  // polished_text가 객체인 경우 문자열로 변환
  const polishedText = typeof result.polished_text === 'string' 
    ? result.polished_text 
    : JSON.stringify(result.polished_text, null, 2);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap">{polishedText}</div>
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