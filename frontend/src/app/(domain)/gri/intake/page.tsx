'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';
import { useIntakeStore } from '@/store/intakeStore';
import { useGriUIStore } from '@/store/griUIStore';
import { PolishResult } from '@/components/PolishResult';
import type { GRIQuestion, GRICategory, GRIItem, GRICompleteData } from '@/types/gri';
import { GRIApiService } from '@/lib/griApi';
import { useSessionStore } from '@/store/sessionStore';

type DisplayMode = 'table' | 'prose';

export default function GRIIntakePage() {
  const user = useAuthStore((s) => s.user);

  const {
    sessionKey,
    selectedItem,
    setSelectedItem,
    setSessionKey,
  } = useGriUIStore();

  const {
    savedItems,
    setCorp,
    setCompanyName,
    saveItem,
    setAnswer,
    setAnswers,
  } = useIntakeStore();

  const ssKey = useSessionStore((s) => s.sessionKey);

  // 세션키 동기화: GRI UI store의 키가 비어있을 때만 sessionStore에서 주입
  useEffect(() => {
    if (ssKey && !sessionKey) {
      setSessionKey(ssKey);
    }
  }, [ssKey, sessionKey, setSessionKey]);

  // auth-storage의 companyname을 intake store와 동기화
  useEffect(() => {
    const syncCompanyName = () => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const authData = JSON.parse(authStorage);
          const companyname = authData?.state?.user?.companyname;
          const corporationId = authData?.state?.user?.corporation_id;
          if (companyname) {
            // intake store에 company 정보 동기화
            setCompanyName(companyname);
            if (corporationId) {
              setCorp(corporationId, companyname);
            }
          }
        } catch (e) {
          console.warn('auth-storage 파싱 실패:', e);
        }
      }
    };

    // 페이지 로드 시 동기화
    syncCompanyName();
  }, [setCompanyName, setCorp]);

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

  // 표/윤문 선택 (질문 id -> 모드)
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});

  // ------- Markdown 표 생성기 -------
  function toMarkdownTable(answer: string) {
    // 줄 단위 분해
    const lines = answer
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const rows: string[] = [];

    for (const raw of lines) {
      // 불릿(-, *, •)로 시작하는 줄만 데이터로 취급
      if (!/^\s*([-*•])\s+/.test(raw)) continue;

      // 불릿 제거
      const line = raw.replace(/^\s*([-*•])\s+/, '');

      // "항목: 값" 형태만 추출
      const m = line.match(/^(.+?):\s*(.+)$/);
      if (!m) continue;

      const key = m[1].trim();

      // 값에서 "숫자,숫자" 형태의 콤마만 제거(텍스트 콤마는 보존)
      const value = m[2].trim().replace(/(?<=\d),(?=\d)/g, '');

      rows.push(`| ${key} | ${value} |`);
    }

    if (!rows.length) return '';
    return ['| 항목 | 값 |', '| --- | --- |', ...rows].join('\n');
  }

  // 현재 아이템의 질문들 중 'table'로 선택한 것만 표로 변환하여 하나의 마크다운으로 합치기
  function buildTablesMarkdown() {
    if (!selectedItem) return '';
    let md = '';
    for (const q of selectedItem.questions) {
              const qid = String(q.id);
        if (displayMode[qid] !== 'table') continue;
        const text = savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text || '';
        if (!text) continue;

      const table = toMarkdownTable(text);
      if (!table) continue;

      md += `\n\n#### ${selectedItem.index_no}-${q.key_alpha}) ${q.question_text || ''}\n${table}\n`;
    }
    return md.trim();
  }

  // 초기 로드
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingData(true);
        const data = await GRIApiService.getCategories();
        setCategories(data.categories || []);
        if (data.categories?.length) setSelectedCategory(data.categories[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '카테고리 로드 중 오류가 발생했습니다.';
        setMessage(msg);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  // 카테고리 선택 시 GRI 전체 데이터 로드
  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      try {
        setIsLoadingData(true);
        const data = await GRIApiService.getCompleteData(selectedCategory.id);
        setGriData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'GRI 데이터 로드 중 오류가 발생했습니다.';
        setMessage(msg);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, [selectedCategory]);

  // GRI 데이터 로드되면 첫 번째 아이템 자동 선택
  useEffect(() => {
    if (griData?.items?.length) {
      setSelectedItem(griData.items[0]);
    }
  }, [griData, setSelectedItem]);

  // 아이템 바뀌면 입력 & 모드 초기화(잔상 제거)
  useEffect(() => {
    setDisplayMode({});
    setMessage('');
  }, [selectedItem?.id]);

  // 선택 핸들러
  const handleCategorySelect = (category: GRICategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    // setAnswers({}); // useIntakeStore에서 관리
    setDisplayMode({});
  };

  const handleItemSelect = (item: GRIItem) => {
    setSelectedItem(item);
    
    // intakeStore에서 저장된 답변 불러오기
    const savedItem = savedItems[item.index_no];
    if (savedItem?.answers) {
      // key_alpha를 question_id로 변환하여 저장
      const newAnswers: Record<string, string> = {};
      item.questions.forEach(q => {
        if (q.key_alpha && savedItem.answers[q.key_alpha]) {
          newAnswers[q.id.toString()] = savedItem.answers[q.key_alpha].answer_text;
        }
      });
      setAnswers(item.index_no, newAnswers);
    } else {
      setAnswers(item.index_no, {});
    }
    
    setDisplayMode({});
  };

  const answeredQuestions =
    selectedItem?.questions?.filter((q: GRIQuestion) => savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text?.trim() !== '')
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
      // 윤문 API 호출
      const answers = selectedItem.questions
        .filter((q) => savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text?.trim())
        .map((q) => ({
          question_id: q.id,
          key_alpha: q.key_alpha,
          text: savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text?.trim(),
        }));

      if (answers.length === 0) {
        setMessage('윤문할 답변이 없습니다. 먼저 답변을 입력해주세요.');
        return;
      }

      // GRI 윤문 API 호출 (올바른 엔드포인트 사용)
      const response = await fetch('/v1/gri/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_key: sessionKey,
          gri_index: selectedItem.index_no,
          item_title: selectedItem.title,
          answers: answers,
          extra_instructions: 'kor_gri_v1',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`윤문 요청 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // 윤문 결과를 intake store에 저장
      if (result.polished_text) {
        saveItem(selectedItem.index_no, { 
          polished_text: result.polished_text,
          last_modified: new Date().toISOString()
        });
        setMessage('윤문이 완료되었습니다. 윤문 결과를 자동으로 저장합니다...');
        
        // 윤문 완료 후 자동으로 저장
        setTimeout(() => {
          savePolishResult();
        }, 1000);
      } else {
        throw new Error('윤문 결과가 없습니다.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '윤문 중 오류가 발생했습니다.';
      setMessage(msg);
      console.error('윤문 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 윤문 결과 저장
  const savePolishResult = async () => {
    if (!selectedItem?.index_no || !savedItems[selectedItem.index_no]?.polished_text) return;
    
    try {
              // 1. intakeStore에 윤문 결과 저장
        if (selectedItem?.index_no) {
          saveItem(selectedItem.index_no, { polished_text: savedItems[selectedItem.index_no]?.polished_text || "" });
        }
      
      // 2. companyname 동기화 확인
      if (user?.companyname) {
        setCompanyName(user.companyname);
      }
      
      // 3. intakeStore에서 모든 저장된 데이터 가져오기
      const polishedItems = savedItems;
      
      // 4. report-storage 형식으로 데이터 변환
      const reportData = Object.keys(polishedItems).reduce((acc, griIndex) => {
        const item = polishedItems[griIndex];
        if (item.answers && selectedItem) {
          acc[griIndex] = {};
          Object.keys(item.answers).forEach((keyAlpha) => {
            // key_alpha를 question_id로 변환
            const question = selectedItem.questions.find(q => q.key_alpha === keyAlpha);
            if (question && typeof question.id === 'number') {
                          acc[griIndex][question.id.toString()] = {
              answer_text: item.answers[keyAlpha]?.answer_text || '',
              polished_text: item.polished_text || '',
              display_mode: 'prose' as const
            };
            }
          });
        }
        return acc;
      }, {} as Record<string, Record<string, { answer_text: string; polished_text?: string; display_mode: 'table' | 'prose' }>>);

      // 5. 데이터 검증
      const validateReportData = (data: Record<string, Record<string, { answer_text: string; polished_text?: string; display_mode: 'table' | 'prose' }>>) => {
        for (const griIndex in data) {
          for (const questionId in data[griIndex]) {
            // questionId가 숫자인지 확인
            if (isNaN(Number(questionId))) {
              console.error(`Invalid question_id: ${questionId} for gri_index: ${griIndex}`);
              return false;
            }
          }
        }
        return true;
      };

      // 데이터 검증 후 저장
      if (!validateReportData(reportData)) {
        throw new Error('Invalid data structure: question_id must be a number');
      }

      // 디버깅: 변환된 데이터 구조 확인
      console.log('Transformed report data:', reportData);
      console.log('Selected item questions:', selectedItem.questions);
      
      // 6. report-storage에 데이터 저장
      // setSavedAnswers(reportData); // useIntakeStore에서 관리
      
             // 7. 백엔드 DB에 저장 (GRI Intake용 엔드포인트 사용)
       if (user?.corporation_id) {
         await GRIApiService.saveIntakeAnswers(Number(user.corporation_id), reportData);
         setMessage('윤문 결과가 저장되었습니다. 공통 섹션에서 확인할 수 있습니다.');
       } else {
         setMessage('기업 정보를 찾을 수 없습니다.');
       }
    } catch (error) {
      console.error('저장 중 오류 발생:', error);
      setMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 로딩 화면
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
            {/* 상단 2패널, 하단 전폭: 수직 스택 */}
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
                      {selectedItem.questions.map((q) => {
                        const qid = String(q.id);
                        const mode = displayMode[qid] ?? 'prose';
                        return (
                          <div key={qid} className="space-y-3">
                            <div className="flex items-start space-x-2">
                              <span className="text-sm font-medium text-gray-700 mt-1">{q.key_alpha}.</span>
                              <div className="flex-1">
                                {/* 표/윤문 선택 토글 */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-gray-500">표/윤문</span>
                                  <div className="inline-flex rounded-md overflow-hidden border">
                                    <button
                                      type="button"
                                      onClick={() => setDisplayMode((m) => ({ ...m, [qid]: 'table' }))}
                                      className={
                                        mode === 'table'
                                          ? 'px-2 py-1 text-xs bg-blue-600 text-white'
                                          : 'px-2 py-1 text-xs bg-white text-gray-700 hover:bg-gray-50'
                                      }
                                    >
                                      표
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDisplayMode((m) => ({ ...m, [qid]: 'prose' }))}
                                      className={
                                        mode === 'prose'
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
                                  placeholder={mode === 'table' 
                                    ? "예시 형식:\n항목: 값\n키워드 나머지 설명\n단순 데이터" 
                                    : "여기에 원문을 입력하세요"}
                                                                     value={savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text || ''}
                                                                      onChange={(e) => {
                                      // intakeStore에 답변 저장
                                      if (selectedItem && q.key_alpha) {
                                        setAnswer(selectedItem.index_no, q.key_alpha, e.target.value);
                                      }
                                    }}
                                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                                                 {savedItems[selectedItem.index_no]?.answers[q.key_alpha]?.answer_text?.trim() && (
                                  <div className="flex items-center space-x-1 mt-2 text-green-600">
                                    <span className="text-sm">✓</span>
                                    <span className="text-sm">답변 완료</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                      {(() => {
                        const tablesMd = buildTablesMarkdown();
                        const anyProse = selectedItem?.questions?.some(
                          (q) => displayMode[String(q.id)] !== 'table',
                        );

                        // LLM이 뱉은 요구사항/헤더를 제거하기 위한 후보
                        const stripHeads = [
                          selectedItem?.title ?? '',
                          ...(selectedItem?.questions?.map((q) => q.question_text ?? '') ?? []),
                        ];

                        // 한 개라도 '윤문'이 있으면 LLM의 prose만 살리고, 전부 표면 LLM은 숨김
                        const keepFromLLM = anyProse ? 'prose' : 'none';

                        return (
                          <PolishResult
                            sessionKey={sessionKey}
                            griIndex={selectedItem.index_no}
                            prependMarkdown={tablesMd}
                            keepFromLLM={keepFromLLM}
                            stripHeads={stripHeads}
                            onPolishRequest={polishAnswers}
                          />
                        );
                      })()}

                      {savedItems[selectedItem?.index_no]?.polished_text && (
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