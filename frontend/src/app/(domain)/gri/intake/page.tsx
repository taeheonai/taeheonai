'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useGriStore } from '@/store/useGriStore';
import { usePolishStore } from '@/store/polishStore';
import { PolishResult } from '@/components/PolishResult';
import type { 
  GRIQuestion, 
  GRICategory, 
  GRIItem, 
  GRICompleteData 
} from '@/types/gri';
import { GRIApiService } from '@/lib/griApi';

export default function GRIIntakePage() {
  const user = useAuthStore((s) => s.user);
  const { 
    sessionKey, 
    selectedItem, 
    answers, 
    setPolished, 
    setSelectedItem, 
    setAnswers,
    setAnswer
  } = useGriStore();
  const { status, result, polish } = usePolishStore();
  
  // 상태 관리
  const [categories, setCategories] = useState<GRICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GRICategory | null>(null);
  const [griData, setGriData] = useState<GRICompleteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  
  // UI 상태
  const [showCategoryList, setShowCategoryList] = useState(true);
  const [showDisclosureList, setShowDisclosureList] = useState(true);
  const [showRequirements, setShowRequirements] = useState(true);

  // 컴포넌트 마운트 시 카테고리 데이터 로드
  useEffect(() => {
    loadCategories();
  }, []);

  // 카테고리 선택 시 GRI 데이터 로드
  useEffect(() => {
    if (selectedCategory) {
      loadGRICompleteData(selectedCategory.id);
    }
  }, [selectedCategory]);

  // GRI 데이터 로드 시 첫 번째 아이템 자동 선택
  useEffect(() => {
    if (griData && griData.items.length > 0) {
      setSelectedItem(griData.items[0]);
    }
  }, [griData, setSelectedItem]);

  // 카테고리 목록 로드
  const loadCategories = async () => {
    try {
      setIsLoadingData(true);
      const data = await GRIApiService.getCategories();
      setCategories(data.categories || []);
      
      // 첫 번째 카테고리 자동 선택
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0]);
      }
      
    } catch (error) {
      console.error('카테고리 로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '카테고리 로드 중 오류가 발생했습니다.';
      setMessage(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  };

  // GRI 완전 데이터 로드
  const loadGRICompleteData = async (categoryId: number) => {
    try {
      setIsLoadingData(true);
      const data = await GRIApiService.getCompleteData(categoryId);
      setGriData(data);
      
    } catch (error) {
      console.error('GRI 데이터 로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : 'GRI 데이터 로드 중 오류가 발생했습니다.';
      setMessage(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  };

  // 카테고리 선택 핸들러
  const handleCategorySelect = (category: GRICategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    setAnswers({});
  };

  // 아이템 선택 핸들러
  const handleItemSelect = (item: GRIItem) => {
    setSelectedItem(item);
    setAnswers({});
  };
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
        extra_instructions: "kor_gri_v1"  // prompt_profile을 extra_instructions로 변경
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
    if (!result?.polished_text || !selectedItem) return;
    
    const timestamp = new Date().toISOString();
    setPolished(selectedItem.index_no, result.polished_text);
    usePolishStore.getState().setSavedAt(timestamp);
    setMessage('윤문 결과가 저장되었습니다. GRI Report 페이지에서 확인할 수 있습니다.');
  };

  // 로딩 상태 표시
  if (isLoadingData) {
    return (
          <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">GRI 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
    );
  }

  // 답변 입력 폼 부분 수정
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {/* ... (기존 헤더 부분 유지) ... */}

            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
              {/* 카테고리 선택 패널 - 더 짧게 */}
              <div className={`col-span-3 transition-all duration-300 ${showCategoryList ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">카테고리 선택</h2>
                      <button
                        onClick={() => setShowCategoryList(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCategory?.id === category.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCategorySelect(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{category.code}</div>
                            <div className="text-sm text-gray-600">{category.title}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 공시 항목 패널 - 더 짧게 */}
              <div className={`col-span-3 transition-all duration-300 ${showDisclosureList ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedCategory ? `${selectedCategory.code} 공시 항목` : 'GRI 공시 항목'}
                      </h2>
                      <button
                        onClick={() => setShowDisclosureList(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {griData?.items.map((item: GRIItem) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id
                            ? 'bg-green-50 border border-green-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleItemSelect(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.index_no}</div>
                            <div className="text-sm text-gray-600">{item.title}</div>
                          </div>
                          <span className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded">
                            {item.questions?.length || 0}개 질문
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              </div>

              {/* 메인 콘텐츠 영역 - 더 넓게 */}
              <div className="col-span-6 space-y-4">
                {/* 답변 입력 폼과 윤문 결과를 하나의 흐름으로 구성 */}
                {selectedItem && selectedItem.questions && (
                  <div className="space-y-4">
                    {/* 요구사항 헤더 */}
                    <div className="bg-white rounded-lg shadow-md">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">?</span>
                          </div>
                          <span>{selectedItem.index_no} 요구사항</span>
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{selectedItem.title}</p>
                      </div>
                      
                      {/* 답변 입력 폼 */}
                      <div className="p-6 space-y-6">
                        {selectedItem.questions.map((question: GRIQuestion) => (
                          <div key={question.id} className="space-y-3">
                            <div className="flex items-start space-x-2">
                              <span className="text-sm font-medium text-gray-700 mt-1">
                                {question.key_alpha}.
                              </span>
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  <div className="whitespace-pre-wrap">
                                    {question.question_text}
                                  </div>
                                  {question.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </label>
                                {question.reference_text && (
                                  <div className="mb-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                    <strong>참고:</strong> 
                                    <div className="whitespace-pre-wrap mt-1">
                                      {question.reference_text}
                                    </div>
                                  </div>
                                )}
                                <textarea
                                  placeholder="답변을 입력해주세요..."
                                  value={answers[question.id.toString()] || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                                    setAnswer(question.id.toString(), e.target.value)
                                  }
                                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {answers[question.id.toString()] && answers[question.id.toString()].trim() !== '' && (
                                  <div className="flex items-center space-x-1 mt-2 text-green-600">
                                    <span className="text-sm">✓</span>
                                    <span className="text-sm">답변 완료</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

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

                    {/* 윤문 결과 - 요구사항 바로 아래에 배치 */}
                    {selectedItem && sessionKey && (
                      <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">윤문 결과</h3>
                        </div>
                        <div className="p-6">
                          <PolishResult 
                            sessionKey={sessionKey} 
                            griIndex={selectedItem.index_no}
                            showSaveHint={false}
                          />
                          
                          {/* 윤문 결과가 있을 때만 액션 버튼 표시 */}
                          {status === 'success' && result?.polished_text && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex justify-end space-x-3">
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
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 메시지 표시 */}
                {message && (
                  <div className={`p-4 rounded-md ${
                    message.includes('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    <p>{message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 패널 토글 버튼들 */}
            <div className="fixed bottom-4 left-4 space-y-2">
              {!showCategoryList && (
                <button
                  onClick={() => setShowCategoryList(true)}
                  className="px-4 py-2 bg-white shadow-lg rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span>→</span>
                    <span>카테고리 목록 열기</span>
                  </span>
                </button>
              )}
              {!showDisclosureList && (
                <button
                  onClick={() => setShowDisclosureList(true)}
                  className="px-4 py-2 bg-white shadow-lg rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span>→</span>
                    <span>공시 목록 열기</span>
                  </span>
                </button>
              )}
              {!showRequirements && (
                <button
                  onClick={() => setShowRequirements(true)}
                  className="px-4 py-2 bg-white shadow-lg rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span>→</span>
                    <span>요구사항 목록 열기</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}