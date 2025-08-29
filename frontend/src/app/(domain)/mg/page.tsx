'use client';

import { useEffect, useCallback } from 'react';
import { useMGStore } from '@/store/mgStore';
// 필요하면 PolishResult를 다이내믹 임포트
// import dynamic from 'next/dynamic';
// const PolishResult = dynamic(() => import('@/components/gri/PolishResult').then(m => m.default), { ssr:false });

export default function MGPage() {
  const { selected, indexesByIssue, loadIndexes } = useMGStore();

  // 🔧 useCallback으로 함수 안정화
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
            // MG Store에 복원
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
  }, [stableLoadIndexes, selected.length]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MG Index Management
          </h1>
          <p className="text-xl text-gray-600">
            선택된 IssuePool들의 GRI 인덱스를 확인하고 관리하세요
          </p>
        </div>

        {/* IssuePool별 GRI 인덱스 목록 */}
        <div className="space-y-8">
          {selected.map(issue => {
            const mgData = indexesByIssue[issue.id];
            
            return (
              <section key={issue.id} className="bg-white rounded-lg shadow-md p-6">
                {/* IssuePool 정보 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-semibold text-gray-900">{issue.issue_pool}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>순위: {issue.ranking}</span>
                      <span>연도: {issue.publish_year}</span>
                      <span>카테고리: {issue.category_id}</span>
                    </div>
                  </div>
                  
                  {/* ESG 분류 표시 */}
                  <div className="inline-block">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      issue.esg_classification_id === 1 ? 'bg-green-100 text-green-800' :
                      issue.esg_classification_id === 2 ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {issue.esg_classification_id === 1 ? '환경(E)' :
                       issue.esg_classification_id === 2 ? '사회(S)' : '거버넌스(G)'}
                    </span>
                  </div>
                </div>

                {/* GRI 인덱스 목록 */}
                {mgData ? (
                  <div className="space-y-3">
                    <h4 className="text-lg font-medium text-gray-700 mb-3">GRI 인덱스</h4>
                    {mgData.gri_indexes && mgData.gri_indexes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mgData.gri_indexes.map(gri => (
                          <div 
                            key={`${issue.id}-${gri.gri_index}`}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-medium text-blue-600">
                                {gri.gri_index}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                gri.grade === 'A' ? 'bg-red-100 text-red-800' :
                                gri.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                등급 {gri.grade}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              빈도: <span className="font-medium">{gri.frequency}</span>
                            </div>
                            {/* <PolishResult sessionKey={...} griIndex={gri.gri_index} /> */}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>이 IssuePool에 해당하는 GRI 인덱스가 없습니다.</p>
                        <p className="text-sm">카테고리 매핑을 확인해주세요.</p>
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
