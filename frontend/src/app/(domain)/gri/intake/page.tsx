'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useGriStore } from '@/store/useGriStore';
import { usePolishStore } from '@/store/polishStore';
import { PolishResult } from '@/components/PolishResult';
import type { GRIQuestion, GRICategory, GRIItem, GRICompleteData } from '@/types/gri';
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
    setAnswer,
  } = useGriStore();

  const { status, result, polish } = usePolishStore();

  // 상태
  const [categories, setCategories] = useState<GRICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GRICategory | null>(null);
  const [griData, setGriData] = useState<GRICompleteData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState('');

  // UI 토글
  const [showCategoryList, setShowCategoryList] = useState(true);
  const [showDisclosureList, setShowDisclosureList] = useState(true);

  // 🔧 표/윤문 선택 토글 상태
  type DisplayMode = 'table' | 'prose';
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});

  // 🔧 답변 문자열 -> Markdown 표 변환
  function toMarkdownTable(answer: string) {
    // 쉼표/세미콜론/줄바꿈으로 분해: "남성:70%, 여성:30%" → 행
    const pairs = answer
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const rows = pairs.map((p) => {
      const [k, ...rest] = p.split(':');
      return `| ${k?.trim() || ''} | ${rest.join(':').trim()} |`;
    });

    if (!rows.length) return '';
    return ['| 항목 | 값 |', '| --- | --- |', ...rows].join('\n');
  }

  // 🔧 현재 선택된 item의 a/b/c에서 'table'인 항목만 표로 묶어 하나의 Markdown으로 생성
  function buildTablesMarkdown() {
    if (!selectedItem) return '';
    let md = '';
    for (const q of selectedItem.questions) {
      const qid = q.id.toString();
      if (displayMode[qid] !== 'table') continue;
      const text = answers[qid]?.trim();
      if (!text) continue;

      const table = toMarkdownTable(text);
      if (!table) continue;

      md += `\n\n#### ${selectedItem.index_no}-${q.key_alpha}) ${q.question_text || ''}\n${table}\n`;
    }
    return md.trim();
  }

  // 초기 로드
  useEffect(() => { void loadCategories(); }, []);

  // 카테고리 선택 시 GRI 전체 데이터 로드
  useEffect(() => {
    if (selectedCategory) void loadGRICompleteData(selectedCategory.id);
  }, [selectedCategory]);

  // GRI 데이터 로드되면 첫 아이템 자동 선택
  useEffect(() => {
    if (griData?.items?.length) setSelectedItem(griData.items[0]);
  }, [griData, setSelectedItem]);

  // 카테고리 목록
  const loadCategories = async () => {
    try {
      setIsLoadingData(true);
      const data = await GRIApiService.getCategories();
      setCategories(data.categories || []);
      if (data.categories?.length) setSelectedCategory(data.categories[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '카테고리 로드 중 오류가 발생했습니다.';
      setMessage(msg);
      // console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // GRI 완전 데이터
  const loadGRICompleteData = async (categoryId: number) => {
    try {
      setIsLoadingData(true);
      const data = await GRIApiService.getCompleteData(categoryId);
      setGriData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GRI 데이터 로드 중 오류가 발생했습니다.';
      setMessage(msg);
      // console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // 선택 핸들러
  const handleCategorySelect = (category: GRICategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    setAnswers({});
  };

  const handleItemSelect = (item: GRIItem) => {
    setSelectedItem(item);
    setAnswers({});
  };

  const answeredQuestions =
    selectedItem?.questions?.filter((q: GRIQuestion) => answers[q.id.toString()]?.trim() !== '')
      .length ?? 0;

  // 저장 (스텁)
  const saveAnswers = async () => {
    setMessage('답변이 저장되었습니다.');
  };

  // 윤문 실행
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
          .filter((q) => answers[q.id.toString()]?.trim())
          .map((q) => ({
            question_id: q.id,
            key_alpha: q.key_alpha,
            text: answers[q.id.toString()].trim(),
          })),
        extra_instructions: 'kor_gri_v1',
      });
      setMessage('윤문이 완료되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '윤문 중 오류가 발생했습니다.';
      setMessage(msg);
      // console.error(err);
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

  // 데이터 로딩 화면
  if (isLoadingData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation user={user} />
          <div className="flex items-center justify-center h-[calc(100vh-100px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">GRI 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // 본문
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />

        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {/* ===== 12열 그리드로 상·하 수직 스택 고정 ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 좌: 카테고리 */}
              <section className={`lg:col-span-6 ${showCategoryList ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md h-full">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">카테고리 선택</h2>
                    <button
                      onClick={() => setShowCategoryList(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCategory?.id === category.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{category.code}</div>
                        <div className="text-sm text-gray-600">{category.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 우: 공시 항목 */}
              <section className={`lg:col-span-6 ${showDisclosureList ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md h-full">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
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
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {(griData?.items || []).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id
                            ? 'bg-green-50 border border-green-200'
                            : 'hover:bg-gray-50'
                        }`}
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
                    ))}
                  </div>
                </div>
              </section>

              {/* 전폭: 요구사항 */}
              <section className="lg:col-span-12">
                {selectedItem && selectedItem.questions && (
                  <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <span className="w-5 h-5 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">
                          ?
                        </span>
                        <span>{selectedItem.index_no} 요구사항</span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{selectedItem.title}</p>
                    </div>

                    <div className="p-6 space-y-6">
                      {selectedItem.questions.map((q) => (
                        <div key={q.id} className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <span className="text-sm font-medium text-gray-700 mt-1">{q.key_alpha}.</span>
                            <div className="flex-1">
                              {/* 🔧 표/윤문 선택 토글 */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-500">표/윤문</span>
                                <div className="inline-flex rounded-md overflow-hidden border">
                                  <button
                                    type="button"
                                    onClick={() => setDisplayMode((m) => ({ ...m, [q.id.toString()]: 'table' }))}
                                    className={
                                      (displayMode[q.id.toString()] ?? 'prose') === 'table'
                                        ? 'px-2 py-1 text-xs bg-blue-600 text-white'
                                        : 'px-2 py-1 text-xs bg-white text-gray-700 hover:bg-gray-50'
                                    }
                                  >
                                    표
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDisplayMode((m) => ({ ...m, [q.id.toString()]: 'prose' }))}
                                    className={
                                      (displayMode[q.id.toString()] ?? 'prose') === 'prose'
                                        ? 'px-2 py-1 text-xs bg-blue-600 text-white'
                                        : 'px-2 py-1 text-xs bg-white text-gray-700 hover:bg-gray-50'
                                    }
                                  >
                                    윤문
                                  </button>
                                </div>
                              </div>

                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="whitespace-pre-wrap">{q.question_text}</div>
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                              </label>

                              {q.reference_text && (
                                <div className="mb-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                  <strong>참고:</strong>
                                  <div className="whitespace-pre-wrap mt-1">{q.reference_text}</div>
                                </div>
                              )}

                              <textarea
                                placeholder="답변을 입력해주세요..."
                                value={answers[q.id.toString()] || ''}
                                onChange={(e) => setAnswer(q.id.toString(), e.target.value)}
                                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {answers[q.id.toString()]?.trim() && (
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

                    <div className="flex justify-end pt-4 border-t space-x-3 px-6 pb-6">
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
                          <span className="flex items-center space-x-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            <span>저장 중...</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-2">
                            <span>💾</span>
                            <span>답변 저장하기</span>
                          </span>
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
                          <span className="flex items-center space-x-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            <span>윤문 중...</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-2">
                            <span>✨</span>
                            <span>인덱스 윤문하기</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 전폭: 윤문 결과 */}
              {selectedItem && sessionKey && (
                <section className="lg:col-span-12">
                  <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">윤문 결과</h3>
                    </div>
                    <div className="p-6">
                      {/* 🔧 표 마크다운을 윤문 결과 위에 먼저 렌더링 */}
                      {(() => {
                        const tablesMd = buildTablesMarkdown();
                        return (
                          <PolishResult 
                            sessionKey={sessionKey} 
                            griIndex={selectedItem.index_no}
                            showSaveHint={false}
                            prependMarkdown={tablesMd}
                          />
                        );
                      })()}

                      {status === 'success' && result?.polished_text && (
                        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                          <button
                            onClick={polishAnswers}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <span className="flex items-center space-x-2">
                              <span>🔄</span>
                              <span>다시 윤문하기</span>
                            </span>
                          </button>
                          <button
                            onClick={savePolishResult}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <span className="flex items-center space-x-2">
                              <span>✓</span>
                              <span>이 결과로 저장하기</span>
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`mt-6 p-4 rounded-md ${
                  message.includes('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}
              >
                <p>{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
