'use client';

import { useEffect, useState } from 'react';
import { useMGStore } from '@/store/mgStore';
import { useSessionStore } from '@/store/sessionStore';
import IndexPolisher from '@/components/IndexPolisher';
import { X, FileText } from 'lucide-react'; // 삭제 아이콘, 리포트 아이콘
import Link from 'next/link';

export default function MGPage() {
  const {
    selected,
    indexesByIssue,
    excludeIndex,
    undoExclude,
    excludedByIssue,
    visibleIndexesSelector,
  } = useMGStore();
  const { sessionKey, threadId, ensureSession } = useSessionStore();

  // ✅ 펼쳐진 카드 상태
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggleOpen = (k: string) => setOpenKey((prev) => (prev === k ? null : k));

  // 세션 초기화
  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (selected.length === 0) {
      try {
        const stored = sessionStorage.getItem('selectedIssuePools');
        console.log('🔍 sessionStorage에서 selectedIssuePools 확인:', stored);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('🔍 파싱된 selectedIssuePools:', parsed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const { setSelected } = useMGStore.getState();
            setSelected(parsed);
            console.log('✅ selectedIssuePools 로드 완료:', parsed.length, '개');
            return;
          }
        }
      } catch (error) {
        console.error('세션 스토리지 복원 실패:', error);
      }
    }
    
    // selected가 변경되었을 때만 loadIndexes 실행
    if (selected.length > 0) {
      console.log('🔍 selected 데이터로 loadIndexes 실행:', selected.length, '개');
      // store에서 직접 함수 호출하여 참조 문제 방지
      const { loadIndexes: storeLoadIndexes } = useMGStore.getState();
      storeLoadIndexes();
    }
  }, [selected.length]); // selected.length만 의존성으로 사용

  // 세션이 없어도 데이터가 있으면 표시
  if (!sessionKey || !threadId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">세션을 준비하는 중...</p>
            <p className="mt-2 text-sm text-gray-500">
              최종 이슈풀 데이터를 불러오는 중입니다...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">MG Index 윤문</h1>
            <Link 
              href="/gri/report"
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Report 페이지로 이동
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {selected.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                최종 이슈풀 데이터가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                중대성 평가를 완료하고 최종 이슈풀을 계산한 후 이 페이지를 방문해주세요.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    window.location.href = '/materiality';
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 inline-flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  중대성 평가로 이동
                </button>
                <div className="text-sm text-gray-500">
                  또는 브라우저 개발자 도구의 Console 탭에서 데이터 로딩 상태를 확인해보세요.
                </div>
              </div>
            </div>
          ) : (
            selected.map((issue) => {
            const mgData = indexesByIssue[issue.id];
            const visible = visibleIndexesSelector(issue.id);
            const excluded = excludedByIssue[issue.id] ?? [];

            return (
              <section key={issue.id} className="bg-white rounded-lg shadow-md p-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <p className="text-lg text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      {issue.issue_pool}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="px-4 py-2 bg-blue-50 text-blue-800 text-sm font-medium rounded-lg">
                      카테고리 {issue.category_id}
                    </span>
                  </div>
                </div>

                {/* 인덱스 목록 */}
                {mgData ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">GRI 인덱스:</h3>
                      {excluded.length > 0 && (
                        <button
                          onClick={() => excluded.forEach((idx) => undoExclude(issue.id, idx))}
                          className="flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          삭제된 인덱스 복원 ({excluded.length})
                        </button>
                      )}
                    </div>

                    {visible.length > 0 ? (
                      <div className="space-y-3">
                        {visible.map((gri) => {
                          const key = `${issue.id}-${gri.gri_index}`;
                          const isOpen = openKey === key;

                          return (
                            <div
                              key={key}
                              className="relative border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {gri.gri_index}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    빈도: {gri.frequency}, 등급: {gri.grade}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {/* 삭제 버튼 */}
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`${gri.gri_index} 인덱스를 삭제하시겠습니까?\n삭제된 인덱스는 하단의 '삭제된 인덱스 복원' 버튼으로 복원할 수 있습니다.`)) {
                                        excludeIndex(issue.id, gri.gri_index);
                                      }
                                    }}
                                    className="p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 group"
                                    title="이 인덱스를 삭제합니다"
                                  >
                                    <X className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                                  </button>
                                  {/* 윤문하기 버튼 */}
                                  <button
                                    onClick={() => toggleOpen(key)}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    {isOpen ? '접기' : '윤문하기'}
                                  </button>
                                </div>
                              </div>

                              {isOpen && (
                                <div className="mt-4">
                                  <IndexPolisher
                                    categoryId={issue.category_id}
                                    griIndex={gri.gri_index}
                                    sessionKey={sessionKey}
                                    threadId={threadId}
                                    corporationId={issue.corporation_id}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">표시할 인덱스가 없습니다.</p>
                        {excluded.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 inline-block">
                            <p className="text-sm text-gray-600 mb-3">
                              삭제된 인덱스: {excluded.join(", ")}
                            </p>
                            <button
                              onClick={() =>
                                excluded.forEach((idx) => undoExclude(issue.id, idx))
                              }
                              className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-center mx-auto"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              삭제된 {excluded.length}개 인덱스 복원
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>GRI 인덱스 데이터를 불러오는 중...</p>
                  </div>
                )}
              </section>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}
