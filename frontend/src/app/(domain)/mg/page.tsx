'use client';

import { useEffect, useCallback, useState } from 'react';
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
  }, [stableLoadIndexes, selected.map((i) => i.id).join(',')]);

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
          <p className="mt-2 text-gray-600">
            선택된 IssuePool의 GRI 인덱스를 윤문합니다.
          </p>
        </div>

        <div className="space-y-8">
          {selected.map((issue) => {
            const mgData = indexesByIssue[issue.id];
            const visible = visibleIndexesSelector(issue.id);
            const excluded = excludedByIssue[issue.id] ?? [];

            return (
              <section key={issue.id} className="bg-white rounded-lg shadow-md p-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    IssuePool #{issue.id}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {issue.publish_year}
                  </span>
                </div>

                {/* 메타 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">카테고리:</span> {issue.category_id}
                  </div>
                  <div>
                    <span className="font-medium">ESG 분류:</span> {issue.esg_classification_id}
                  </div>
                  <div>
                    <span className="font-medium">순위:</span> {issue.ranking}
                  </div>
                </div>

                {/* 이슈 풀 설명 */}
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Issue Pool:</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{issue.issue_pool}</p>
                </div>

                {/* 인덱스 목록 */}
                {mgData ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">GRI 인덱스:</h3>

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
                              {/* 숨기기 버튼 */}
                              <button
                                onClick={() => excludeIndex(issue.id, gri.gri_index)}
                                className="absolute top-2 right-2 p-1 rounded hover:bg-red-50"
                                title="이 인덱스를 숨깁니다"
                              >
                                <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
                              </button>

                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {gri.gri_index}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    빈도: {gri.frequency}, 등급: {gri.grade}
                                  </p>
                                </div>
                                <button
                                  onClick={() => toggleOpen(key)}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                >
                                  {isOpen ? '접기' : '윤문하기'}
                                </button>
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
                      <div className="text-center py-8 text-gray-500">
                        <p>표시할 인덱스가 없습니다.</p>
                        {excluded.length > 0 && (
                          <button
                            onClick={() =>
                              excluded.forEach((idx) => undoExclude(issue.id, idx))
                            }
                            className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            숨긴 {excluded.length}개 인덱스 복원
                          </button>
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
