'use client';

import { useEffect, useCallback, useState } from 'react';
import { useMGStore } from '@/store/mgStore';
import { useSessionStore } from '@/store/sessionStore';
import IndexPolisher from '@/components/IndexPolisher'; // ⬅️ 앞서 만든 컴포넌트

export default function MGPage() {
  const { selected, indexesByIssue, loadIndexes } = useMGStore();
  const { sessionKey, threadId } = useSessionStore();

  // ✅ 펼쳐진 카드 관리: issueId + griIndex 조합으로 open 상태 보관
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggleOpen = (k: string) => setOpenKey(prev => (prev === k ? null : k));

  // 🔧 세션/스레드/회사 ID는 sessionStore에서 자동 생성된 값 사용
  // const sessionKey = 'sess_web';              // ❌ 하드코딩 제거
  // const threadId = 't_web';                   // ❌ 하드코딩 제거
  // issue.corporation_id 를 사용 (각 카드마다 다를 수 있음)

  const stableLoadIndexes = useCallback(() => {
    if (selected.length > 0) {
      loadIndexes();
    }
  }, [selected, loadIndexes]);

  useEffect(() => { 
    // selected가 비어있으면 세션 스토리지에서 복원 시도
    if (selected.length === 0) {
      try {
        const stored = sessionStorage.getItem('selectedIssuePools');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const { setSelected } = useMGStore.getState();
            setSelected(parsed);
            return; // 다음 useEffect에서 처리
          }
        }
      } catch (error) {
        console.error('세션 스토리지 복원 실패:', error);
      }
    }
    stableLoadIndexes();
  }, [stableLoadIndexes, selected.map(i => i.id).join(',')]);

  // 세션이 준비되지 않았으면 로딩 표시
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
          {/* 세션 정보 디버깅용 (개발 완료 후 제거 가능) */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
            <p><strong>Session Key:</strong> {sessionKey.substring(0, 8)}...</p>
            <p><strong>Thread ID:</strong> {threadId}</p>
          </div>
        </div>

        <div className="space-y-8">
          {selected.map(issue => {
            const mgData = indexesByIssue[issue.id];

            return (
              <section key={issue.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    IssuePool #{issue.id}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {issue.publish_year}
                  </span>
                </div>

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

                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Issue Pool:</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{issue.issue_pool}</p>
                </div>

                {mgData ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">GRI 인덱스:</h3>
                    <div className="space-y-3">
                      {mgData.gri_indexes && mgData.gri_indexes.length > 0 ? (
                        mgData.gri_indexes.map(gri => {
                          const key = `${issue.id}-${gri.gri_index}`;
                          const isOpen = openKey === key;

                          return (
                            <div key={key} className="border border-gray-200 rounded-lg p-4">
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
                                    sessionKey={sessionKey}             // ✅ sessionStore에서 가져온 값
                                    threadId={threadId}                 // ✅ sessionStore에서 가져온 값
                                    corporationId={issue.corporation_id /* TODO: issue에 없다면 상위에서 주입 */}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>이 IssuePool에 해당하는 GRI 인덱스가 없습니다.</p>
                          <p className="text-sm">카테고리 매핑을 확인해주세요.</p>
                        </div>
                      )}
                    </div>
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
