'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useGriStore } from '@/store/useGriStore';
import { usePolishStore } from '@/store/polishStore';
import { PolishResult } from '@/components/PolishResult';
import type { GRIQuestion, GRICategory } from '@/types/gri';
import { GRIApiService } from '@/lib/griApi';

export default function GRIIntakePage() {
  const user = useAuthStore((s) => s.user);
  const { sessionKey, selectedItem, answers, setPolished } = useGriStore();
  const { status, result, polish } = usePolishStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<GRICategory[]>([]);
  
  // 카테고리 데이터 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const response = await GRIApiService.getCategories();
        setCategories(response.categories);
      } catch (error) {
        console.error('카테고리 로드 오류:', error);
        setMessage('카테고리 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);
  const answeredQuestions = selectedItem?.questions?.filter(
    (q: GRIQuestion) => answers[q.id.toString()]?.trim() !== ''
  ).length ?? 0;

  const saveAnswers = async () => {
    // 답변 저장 로직 구현
    setMessage('답변이 저장되었습니다.');
  };

  // ... (기존 코드 유지, polishAnswers 함수만 수정)

  // 답변 윤문
  const polishAnswers = async () => {
    if (!sessionKey || !selectedItem) return;
    
    setIsLoading(true);
    setMessage('');
    
    try {
      await polish({
        session_key: sessionKey,
        gri_index: selectedItem.index_no,
        item_title: selectedItem.title,
        answers: selectedItem.questions
          .filter((q: GRIQuestion) => answers[q.id.toString()] && answers[q.id.toString()].trim() !== '')
          .map((q: GRIQuestion) => ({
            question_id: q.id,
            key_alpha: q.key_alpha,
            text: answers[q.id.toString()].trim()
          })),
        prompt_profile: "kor_gri_v1"
      });

      setMessage('윤문이 완료되었습니다.');
      
    } catch (error) {
      console.error('윤문 중 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '윤문 중 오류가 발생했습니다.';
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 윤문 결과 저장
  const savePolishResult = () => {
    if (!result?.data?.polished_text || !selectedItem) return;
    
    const timestamp = new Date().toISOString();
    setPolished(selectedItem.index_no, result.data.polished_text);
    usePolishStore.getState().setSavedAt(timestamp);
    setMessage('윤문 결과가 저장되었습니다. GRI Report 페이지에서 확인할 수 있습니다.');
  };

  // ... (기존 코드 유지)

  // 답변 입력 폼 부분 수정
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {/* ... (기존 헤더 부분 유지) ... */}

            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
              {/* 카테고리 목록 패널 */}
              <div className="col-span-3 bg-white rounded-lg shadow-md p-4 overflow-auto">
                <h2 className="text-lg font-semibold mb-4">GRI 카테고리</h2>
                {categories.length > 0 ? (
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li
                        key={category.id}
                        className="p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          // TODO: 카테고리 선택 로직 구현
                          console.log('Selected category:', category);
                        }}
                      >
                        <div className="font-medium">{category.title}</div>
                        <div className="text-sm text-gray-500">{category.code}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    {isLoading ? '카테고리를 불러오는 중...' : '카테고리가 없습니다.'}
                  </div>
                )}
              </div>

              {/* 메인 콘텐츠 영역 */}
              <div className="col-span-6 space-y-4">
                {/* ... (기존 요구사항 헤더 유지) ... */}

                {/* 답변 입력 폼 */}
                {selectedItem && selectedItem.questions && (
                  <>
                    <div className="bg-white rounded-lg shadow-md">
                      {/* ... (기존 답변 입력 폼 내용 유지) ... */}

                      {/* 저장 및 윤문 버튼 */}
                      <div className="flex justify-end pt-4 border-t space-x-3">
                        <button
                          onClick={saveAnswers}
                          disabled={isLoading || answeredQuestions === 0}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isLoading || answeredQuestions === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>저장 중...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>💾</span>
                              <span>답변 저장하기</span>
                            </div>
                          )}
                        </button>
                        <button
                          onClick={polishAnswers}
                          disabled={isLoading || answeredQuestions === 0}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isLoading || answeredQuestions === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>윤문 중...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>✨</span>
                              <span>인덱스 윤문하기</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 윤문 결과 표시 */}
                    {status === 'success' && result?.data && selectedItem && sessionKey && (
                      <div className="relative">
                        <div className="absolute right-0 top-0 z-10 flex space-x-2 mb-4">
                          <button
                            onClick={() => polishAnswers()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span>🔄</span>
                              <span>다시 윤문하기</span>
                            </div>
                          </button>
                          <button
                            onClick={savePolishResult}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span>✓</span>
                              <span>이 결과로 저장하기</span>
                            </div>
                          </button>
                        </div>
                        <div className="mt-12">
                          <PolishResult 
                            sessionKey={sessionKey} 
                            griIndex={selectedItem.index_no}
                            showSaveHint
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 메시지 표시 */}
                {message && (
                  <div className={`p-4 rounded-md ${
                    message.includes('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    <p>{message}</p>
                  </div>
                )}

                {/* ... (기존 데이터가 없을 때 표시 유지) ... */}
              </div>
            </div>

            {/* ... (기존 패널 토글 버튼들 유지) ... */}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}