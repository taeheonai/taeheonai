'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// GRI 카테고리 데이터
const griCategories = [
  { id: 'GRI-2', name: 'General Disclosures', year: '2021', selected: true },
  { id: 'GRI-3', name: 'Material Topics', year: '2021', selected: false },
  { id: 'GRI-201', name: 'Economic Performance', year: '2016', selected: false },
  { id: 'GRI-202', name: 'Market Presence', year: '2016', selected: false },
  { id: 'GRI-203', name: 'Indirect Economic Impacts', year: '2016', selected: false },
  { id: 'GRI-204', name: 'Procurement Practices', year: '2016', selected: false },
  { id: 'GRI-205', name: 'Anti-corruption', year: '2016', selected: false },
  { id: 'GRI-206', name: 'Anti-competitive Behavior', year: '2016', selected: false },
  { id: 'GRI-207', name: 'Tax', year: '2019', selected: false },
];

// GRI 공시 항목 데이터
const disclosureItems = [
  { id: '2-1', name: '조직 개요', tag: 'GRI-2' },
  { id: '2-2', name: '이사회 및 최고경영진', tag: 'GRI-2' },
  { id: '2-3', name: '이해관계자 참여', tag: 'GRI-2' },
  { id: '2-4', name: '보고서 내용', tag: 'GRI-2' },
  { id: '2-5', name: '외부 검증', tag: 'GRI-2' },
  { id: '2-6', name: '활동, 가치 사슬 및 기타 비즈니스 관계', tag: 'GRI-2' },
  { id: '2-7', name: '근로자', tag: 'GRI-2' },
  { id: '2-8', name: '거버넌스', tag: 'GRI-2' },
  { id: '2-9', name: '윤리 및 무결성', tag: 'GRI-2' },
];

// 요구사항 질문 데이터
const requirements = [
  {
    id: '2-1',
    title: '조직 개요',
    questions: [
      {
        id: '2-1-a',
        question: '법적 명칭을 보고해주세요.',
        answer: '',
        required: true
      },
      {
        id: '2-1-b',
        question: '소유권 및 법인 구분을 보고해주세요.',
        answer: '',
        required: true
      },
      {
        id: '2-1-c',
        question: '본사 위치를 보고해주세요.',
        answer: '',
        required: true
      },
      {
        id: '2-1-d',
        question: '주요 운영 국가를 보고해주세요.',
        answer: '',
        required: false
      },
      {
        id: '2-1-e',
        question: '사업의 성격, 규모 및 시장을 보고해주세요.',
        answer: '',
        required: true
      }
    ]
  }
];

interface AnswerData {
  question: string;
  answer: string;
  company_id?: string;
  date?: string;
  gri_index?: string;
}

export default function GRIIntakePage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('GRI-2');
  const [selectedDisclosure, setSelectedDisclosure] = useState('2-1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(true);
  const [showDisclosureList, setShowDisclosureList] = useState(true);
  const [showRequirements, setShowRequirements] = useState(true);
  const [message, setMessage] = useState('');

  // 현재 선택된 요구사항
  const currentRequirement = requirements.find(req => req.id === selectedDisclosure);

  // 답변 완료율 계산
  const totalQuestions = currentRequirement?.questions.length || 0;
  const answeredQuestions = currentRequirement?.questions.filter(q => 
    answers[q.id] && answers[q.id].trim() !== ''
  ).length || 0;
  const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  // 답변 저장 함수
  const saveAnswers = async () => {
    if (!currentRequirement) return;

    setIsLoading(true);
    setMessage('');
    
    try {
      const savePromises = currentRequirement.questions
        .filter(q => answers[q.id] && answers[q.id].trim() !== '')
        .map(async (question) => {
          const answerData: AnswerData = {
            question: question.question,
            answer: answers[question.id],
            company_id: 'COMPANY-001', // 실제로는 로그인된 사용자의 회사 ID
            date: new Date().toISOString().split('T')[0],
            gri_index: question.id
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
    } catch (error) {
      console.error('답변 저장 중 오류:', error);
      setMessage('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 답변 업데이트 함수
  const updateAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

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
                {griCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{category.id}</div>
                        <div className="text-sm text-gray-600">{category.name}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {category.year}
                      </span>
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
                  <h2 className="text-lg font-semibold text-gray-900">GRI {selectedCategory} 공시 항목</h2>
                  <button
                    onClick={() => setShowDisclosureList(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                {disclosureItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedDisclosure === item.id
                        ? 'bg-green-50 border border-green-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedDisclosure(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.id}</div>
                        <div className="text-sm text-gray-600">{item.name}</div>
                      </div>
                      <span className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded">
                        {item.tag}
                      </span>
                    </div>
                  </div>
                ))}
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
            </div>

            {/* 답변 입력 폼 */}
            {currentRequirement && (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">?</span>
                    </div>
                    <span>{currentRequirement.id} 요구사항</span>
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {currentRequirement.questions.map((question, index) => (
                    <div key={question.id} className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-sm font-medium text-gray-700 mt-1">
                          {String.fromCharCode(97 + index)}.
                        </span>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {question.question}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <textarea
                            placeholder="답변을 입력해주세요..."
                            value={answers[question.id] || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateAnswer(question.id, e.target.value)}
                            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {answers[question.id] && answers[question.id].trim() !== '' && (
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
                          <span>답변 저장하기 (AI 윤문 포함)</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
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
    </ProtectedRoute>
  );
}
