'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IssuePool, IssuePoolAPI } from '@/lib/issuepool';

export default function MaterialityPage() {
  const [issuePools, setIssuePools] = useState<IssuePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 랜덤 IssuePool 10개 로드
  useEffect(() => {
    loadRandomIssuePools();
  }, []);

  const loadRandomIssuePools = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await IssuePoolAPI.getRandomIssuePools(10);
      setIssuePools(data);
    } catch (err) {
      setError('IssuePool 데이터를 불러오는데 실패했습니다.');
      console.error('Error loading issue pools:', err);
    } finally {
      setLoading(false);
    }
  };

  // GRI 페이지로 이동하면서 데이터 전달
  const navigateToGRI = () => {
    if (issuePools.length > 0) {
      // 세션 스토리지에 데이터 저장 (페이지 간 데이터 전달용)
      sessionStorage.setItem('selectedIssuePools', JSON.stringify(issuePools));
      router.push('/gri');
    }
  };

  // 새로고침 버튼
  const handleRefresh = () => {
    loadRandomIssuePools();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">IssuePool 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Materiality Assessment
          </h1>
          <p className="text-xl text-gray-600">
            IssuePool에서 랜덤으로 선택된 10개의 이슈를 확인하고 GRI 페이지로 전달하세요
          </p>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={handleRefresh}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🔄 새로운 랜덤 데이터
          </button>
          <button
            onClick={navigateToGRI}
            disabled={issuePools.length === 0}
            className={`font-bold py-3 px-6 rounded-lg transition-colors ${
              issuePools.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            📊 GRI 페이지로 이동 ({issuePools.length}개 선택됨)
          </button>
        </div>

        {/* IssuePool 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issuePools.map((issuePool, index) => (
            <div
              key={issuePool.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  순위: {issuePool.ranking}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-3">
                {issuePool.issue_pool}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>기업 ID:</span>
                  <span className="font-medium">{issuePool.corporation_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>발행 연도:</span>
                  <span className="font-medium">{issuePool.publish_year}</span>
                </div>
                <div className="flex justify-between">
                  <span>카테고리 ID:</span>
                  <span className="font-medium">{issuePool.category_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESG 분류:</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    issuePool.esg_classification_id === 1 ? 'bg-green-100 text-green-800' :
                    issuePool.esg_classification_id === 2 ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {issuePool.esg_classification_id === 1 ? '환경(E)' :
                     issuePool.esg_classification_id === 2 ? '사회(S)' : '거버넌스(G)'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 요약 정보 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">선택된 데이터 요약</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{issuePools.length}</div>
              <div className="text-sm text-gray-600">총 이슈 수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {issuePools.filter(ip => ip.esg_classification_id === 1).length}
              </div>
              <div className="text-sm text-gray-600">환경(E)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {issuePools.filter(ip => ip.esg_classification_id === 2).length}
              </div>
              <div className="text-sm text-gray-600">사회(S)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {issuePools.filter(ip => ip.esg_classification_id === 3).length}
              </div>
              <div className="text-sm text-gray-600">거버넌스(G)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}