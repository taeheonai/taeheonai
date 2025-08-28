'use client';

import { usePolishStore } from '@/store/polishStore';
import { useEffect } from 'react';

interface PolishResultProps {
  sessionKey: string;
  griIndex: string;
}

export const PolishResult: React.FC<PolishResultProps> = ({ sessionKey, griIndex }) => {
  const { status, result, error, run } = usePolishStore((s) => ({
    status: s.status,
    result: s.result,
    error: s.error,
    run: s.run,
  }));

  useEffect(() => {
    if (sessionKey && griIndex) {
      run({
        session_key: sessionKey,
        gri_index: griIndex,
        answers: [], // 이 부분은 실제 답변 데이터로 채워야 합니다
      });
    }
  }, [sessionKey, griIndex, run]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">윤문 중...</span>
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

  if (status !== 'success' || !result) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap">{result.draft}</div>
      </div>

      {result.citations?.length ? (
        <div className="mt-4">
          <h4 className="text-md font-semibold mb-2">참고/출처</h4>
          <ul className="list-disc pl-5">
            {result.citations.map((citation, index) => (
              <li key={index} className="text-sm text-gray-600">{citation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 text-sm text-gray-500">
        <p>세션: {result.meta.session_key} · 인덱스: {result.meta.gri_index}</p>
        {result.meta.model && <p>모델: {result.meta.model}</p>}
        {result.meta.created_at && (
          <p>작성 시간: {new Date(result.meta.created_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
};