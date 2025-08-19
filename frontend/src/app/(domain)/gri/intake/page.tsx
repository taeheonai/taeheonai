'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// GRI 데이터 타입 정의
interface GRICategory {
  id: number;
  code: string;
  title: string;
  display_order: number;
}

interface GRIItem {
  id: number;
  index_no: string;
  title: string;
  display_order: number;
}

interface GRIQuestion {
  id: number;
  key_alpha: string;
  question_text: string;
  reference_text: string | null;
  question_type: string;
  display_order: number;
  required: boolean;
}

interface GRICompleteData {
  category: GRICategory;
  items: Array<{
    id: number;
    index_no: string;
    title: string;
    questions: GRIQuestion[];
  }>;
  item_count: number;
}

export default function GRIIntakePage() {
  const { user } = useAuth();
  
  // 상태 관리
  const [categories, setCategories] = useState<GRICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GRICategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [griData, setGriData] = useState<GRICompleteData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  
  // UI 상태
  const [showCategoryList, setShowCategoryList] = useState(true);
  const [showDisclosureList, setShowDisclosureList] = useState(true);
  const [showRequirements, setShowRequirements] = useState(true);
  
  // 세션 키 생성 (사용자별 고유 식별자)
  const sessionKey = user?.id ? `user_${user.id}_${Date.now()}` : `session_${Date.now()}`;

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
  }, [griData]);

  // 카테고리 목록 로드
  const loadCategories = async () => {
    try {
      setIsLoadingData(true);
      const response = await fetch('/api/v1/gri/categories');
      
      if (!response.ok) {
        throw new Error('카테고리 로드 실패');
      }
      
      const data = await response.json();
      setCategories(data.categories || []);
      
      // 첫 번째 카테고리 자동 선택
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0]);
      }
      
    } catch (error) {
      console.error('카테고리 로드 오류:', error);
      setMessage('카테고리 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // GRI 완전 데이터 로드
  const loadGRICompleteData = async (categoryId: number) => {
    try {
      setIsLoadingData(true);
      const response = await fetch(`/api/v1/gri/complete/${categoryId}`);
      
      if (!response.ok) {
        throw new Error('GRI 데이터 로드 실패');
      }
      
      const data = await response.json();
      setGriData(data);
      
    } catch (error) {
      console.error('GRI 데이터 로드 오류:', error);
      setMessage('GRI 데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // 답변 완료율 계산
  const totalQuestions = selectedItem?.questions?.length || 0;
  const answeredQuestions = selectedItem?.questions?.filter((q: GRIQuestion) => 
    answers[q.id.toString()] && answers[q.id.toString()].trim() !== ''
  ).length || 0;
  const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  // 답변 저장 함수
  const saveAnswers = async () => {
    if (!selectedItem || !selectedItem.questions) return;

    setIsLoading(true);
    setMessage('');
    
    try {
      const savePromises = selectedItem.questions
        .filter((q: GRIQuestion) => answers[q.id.toString()] && answers[q.id.toString()].trim() !== '')
        .map(async (question: GRIQuestion) => {
          const answerData = {
            question_id: question.id,
            session_key: sessionKey,
            answer_text: answers[question.id.toString()],
            answer_json: null
          };

          const response = await fetch('/api/v1/gri/answers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(answerData),
          });

          if (!response.ok) {
            throw new Error(`Failed to save answer for ${question.id}`);
          }

          return response.json();
        });

      await Promise.all(savePromises);
      setMessage('답변이 성공적으로 저장되었습니다.');
      
      // 답변 저장 후 진행률 확인
      checkProgress();
      
    } catch (error) {
      console.error('답변 저장 중 오류:', error);
      setMessage('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 진행률 확인
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/v1/gri/progress/${sessionKey}`);
      if (response.ok) {
        const progressData = await response.json();
        console.log('진행률:', progressData);
      }
    } catch (error) {
      console.error('진행률 확인 오류:', error);
    }
  };

  // 답변 업데이트 함수
  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // 카테고리 선택 핸들러
  const handleCategorySelect = (category: GRICategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    setAnswers({});
  };

  // 아이템 선택 핸들러
  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setAnswers({});
  };

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {/* 헤더 */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">GRI 보고서 작성</h1>
              <p className="text-gray-600 mt-2">Global Reporting Initiative 표준에 따른 지속가능성 보고서 작성</p>
            </div>

            {/* 메시지 표시 */}
            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.includes('성공') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
              {/* 카테고리 선택 패널 */}
              <div className={`col-span-3 transition-all duration-300 ${showCategoryList ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md h-full">
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
                  <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
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

              {/* 공시 항목 패널 */}
              <div className={`col-span-3 transition-all duration-300 ${showDisclosureList ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md h-full">
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
                  <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                    {griData?.items.map((item) => (
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

              {/* 메인 콘텐츠 영역 */}
              <div className="col-span-6 space-y-4">
                {/* 요구사항 헤더 */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">?</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-purple-900">Requirements</h2>
                        <p className="text-purple-700">요구사항 질문 목록</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRequirements(false)}
                      className="text-purple-400 hover:text-purple-600"
                    >
                      ✕
                    </button>
                  </div>
                  {selectedItem && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-purple-700">총 {totalQuestions}개 세부 질문</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-purple-700">
                          답변 완료: {answeredQuestions}개 ({completionRate.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 답변 입력 폼 */}
                {selectedItem && selectedItem.questions && (
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
                    <div className="p-6 space-y-6">
                      {selectedItem.questions.map((question: GRIQuestion, index: number) => (
                        <div key={question.id} className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <span className="text-sm font-medium text-gray-700 mt-1">
                              {question.key_alpha}.
                            </span>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {question.question_text}
                                {question.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </label>
                              {question.reference_text && (
                                <div className="mb-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                  <strong>참고:</strong> {question.reference_text}
                                </div>
                              )}
                              <textarea
                                placeholder="답변을 입력해주세요..."
                                value={answers[question.id.toString()] || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                                  updateAnswer(question.id.toString(), e.target.value)
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

                      {/* 저장 버튼 */}
                      <div className="flex justify-end pt-4 border-t">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* 데이터가 없을 때 */}
                {!selectedItem && (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">GRI Index를 선택해주세요</h3>
                    <p className="text-gray-600">왼쪽에서 카테고리와 GRI Index를 선택하면 질문 목록이 표시됩니다.</p>
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
