'use client';

import { usePolishStore } from '@/store/polishStore';
import { useEffect, useCallback, useRef, useState } from 'react';

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
  // 🔧 컴포넌트 레벨 에러 상태 관리
  const [componentError, setComponentError] = useState<string | null>(null);

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
      setComponentError(null); // 에러 상태 초기화
      await fetchPolishResult(sessionKey, griIndex);
    } catch (error) {
      // 🔧 컴포넌트가 언마운트된 경우 에러 무시
      if (isMounted.current) {
        console.error('윤문 결과 조회 실패:', error);
        setComponentError('윤문 결과 조회 중 오류가 발생했습니다.');
      }
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

  useEffect(() => {
    // 🔧 이미 결과가 있거나 로딩 중이면 API 호출하지 않음
    // 🔧 초기 자동 호출 방지: 사용자가 명시적으로 요청할 때만 조회
    if (sessionKey && griIndex && status === 'idle' && !result && isMounted.current) {
      // 🔧 자동 호출 대신 사용자 액션 기반 호출로 변경
      console.log('🔄 윤문 결과 자동 조회 비활성화 - 사용자 액션 기반으로 변경');
    }
  }, [sessionKey, griIndex, status, result]);

  // 🔧 컴포넌트가 언마운트된 경우 아무것도 렌더링하지 않음
  if (!isMounted.current) {
    return null;
  }

  // 🔧 컴포넌트 레벨 에러 처리
  if (componentError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium">오류가 발생했습니다</span>
        </div>
        <p className="mt-2">{componentError}</p>
        <button
          onClick={() => setComponentError(null)}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
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

  // 🔧 not_found 상태를 별도로 처리
  if (status === 'not_found') {
    return (
      <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">윤문 결과가 없습니다</span>
        </div>
        <p className="mt-2">{error}</p>
        <p className="text-sm mt-2 text-blue-600">
          윤문을 실행하면 결과가 여기에 표시됩니다.
        </p>
        <button
          onClick={() => stableFetchPolishResult()}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          윤문 결과 확인하기
        </button>
      </div>
    );
  }

  if (status !== 'success' || !result?.polished_text) {
    return (
      <div className="p-4 bg-gray-50 text-gray-600 rounded-md">
        <p>윤문 결과가 없습니다. 윤문을 실행해주세요.</p>
        <button
          onClick={() => stableFetchPolishResult()}
          className="mt-3 px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
        >
          윤문 결과 확인하기
        </button>
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