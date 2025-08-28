import React, { useEffect } from 'react';
import { usePolishStore } from '@/store/polishStore';

interface PolishResultProps {
  sessionKey: string;
  griIndex: string;
}

export const PolishResult: React.FC<PolishResultProps> = ({ sessionKey, griIndex }) => {
  const { polishResult, isLoading, error, fetchPolishResult } = usePolishStore();

  useEffect(() => {
    if (sessionKey && griIndex) {
      fetchPolishResult(sessionKey, griIndex);
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  if (!polishResult) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap">{polishResult.data.polished_text}</div>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>작성 시간: {new Date(polishResult.data.created_at).toLocaleString()}</p>
        <p>모델: {polishResult.data.model}</p>
      </div>
    </div>
  );
};
