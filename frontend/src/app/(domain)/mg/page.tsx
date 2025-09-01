'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useMGStore } from '@/store/mgStore';
import { useSessionStore } from '@/store/sessionStore';
import IndexPolisher from '@/components/IndexPolisher';
import { X } from 'lucide-react'; // 삭제 아이콘

export default function MGPage() {
  const {
    selected,
    indexesByIssue,
    loadIndexes,
    excludeIndex,
    undoExclude,
    excludedByIssue,
    visibleIndexesSelector,
  } = useMGStore();
  const { sessionKey, threadId } = useSessionStore();

  // ✅ 펼쳐진 카드 상태
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggleOpen = (k: string) => setOpenKey((prev) => (prev === k ? null : k));

  const stableLoadIndexes = useCallback(() => {
    if (selected.length > 0) {
      loadIndexes();
    }
  }, [selected, loadIndexes]);

  // 선택된 항목들의 ID를 문자열로 변환
  const selectedIds = useMemo(() => selected.map(i => i.id).join(','), [selected]);

  useEffect(() => {
    if (selected.length === 0) {
      try {
        const stored = sessionStorage.getItem('selectedIssuePools');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const { setSelected } = useMGStore.getState();
            setSelected(parsed);
            return;
          }
        }
      } catch (error) {
        console.error('세션 스토리지 복원 실패:', error);
      }
    }
    stableLoadIndexes();
  }, [stableLoadIndexes, selectedIds, selected.length]);

  // 세션 준비 체크
  if (!sessionKey || !threadId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">세션을 준비하는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MG Index 윤문</h1>
        </div>

        <div className="space-y-8">
          {selected.map((issue) => {
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
          })}
        </div>
      </div>
    </div>
  );
}
