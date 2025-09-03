import React from 'react';
import { downloadExcelFromBase64 } from '../download_excel_from_base64';

interface SearchResultProps {
  searchResult: any;
  isSearchResultCollapsed: boolean;
  isFullResultCollapsed: boolean;
  excelFilename: string | null;
  excelBase64: string | null;
  setIsSearchResultCollapsed: (collapsed: boolean) => void;
  setIsFullResultCollapsed: (collapsed: boolean) => void;
  setCompanyId: (id: string) => void;
  setSearchPeriod: (period: { start_date: string; end_date: string }) => void;
}

const SearchResult: React.FC<SearchResultProps> = ({
  searchResult,
  isSearchResultCollapsed,
  isFullResultCollapsed,
  excelFilename,
  excelBase64,
  setIsSearchResultCollapsed,
  setIsFullResultCollapsed,
  setCompanyId,
  setSearchPeriod
}) => {
  return (
    <div id="media-search-result" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          🔍 미디어 검색 결과
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSearchResultCollapsed(!isSearchResultCollapsed)}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <span>{isSearchResultCollapsed ? '펼치기' : '접기'}</span>
            <span className="text-lg">{isSearchResultCollapsed ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>
      
      {/* 접힌 상태일 때 간단한 요약만 표시 */}
      {isSearchResultCollapsed ? (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-gray-700">
              <strong>기업:</strong> {searchResult.data?.company_id} | 
              <strong>기간:</strong> {searchResult.data?.search_period?.start_date} ~ {searchResult.data?.search_period?.end_date} | 
              <strong>결과:</strong> {searchResult.data?.total_results || 0}개 기사
            </div>
            {excelFilename && excelBase64 && (
              <button
                onClick={() => downloadExcelFromBase64(excelBase64, excelFilename)}
                className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                엑셀 다운로드
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">검색 정보</h3>
              <p className="text-blue-700">
                <strong>기업:</strong> {searchResult.data?.company_id}
                <br />
                <strong>검색 기간:</strong> {searchResult.data?.search_period?.start_date} ~{' '}
                {searchResult.data?.search_period?.end_date}
                <br />
                <strong>총 결과:</strong> {searchResult.data?.total_results || 0}개 기사
              </p>
            </div>
            {excelFilename && excelBase64 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">📊 엑셀 파일</h3>
                <p className="text-green-700 mb-3">
                  검색 결과가 엑셀 파일로 생성되었습니다.
                </p>
                <button
                  onClick={() => downloadExcelFromBase64(excelBase64, excelFilename)}
                  className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  엑셀 다운로드
                </button>
              </div>
            )}
          </div>
          {/* 검색된 기사 미리보기 */}
          {searchResult.data?.articles && searchResult.data.articles.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">
                📰 검색된 기사 미리보기 (최대 8개)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchResult.data.articles
                  .slice(0, 8)
                  .map((article: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => {
                        if (article.originallink) {
                          window.open(
                            article.originallink,
                            '_blank',
                            'noopener,noreferrer',
                          );
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">
                          {article.pubDate
                            ? new Date(article.pubDate)
                                .toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })
                                .replace(/\. /g, '. ')
                                .replace(/\.$/, '.')
                            : '날짜 없음'}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">🏷️검색 키워드:</span>{' '}
                          {article.issue || '일반'}
                        </div>
                      </div>
                      <h4
                        className="font-medium text-gray-800 mb-2 text-sm leading-tight"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {article.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <span className="mr-1">🏢</span>
                          {article.company || '기업명 없음'}
                        </span>
                        {article.original_category && (
                          <span className="flex items-center">
                            <span className="mr-1">📂</span>
                            {article.original_category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 검색 결과 저장 버튼 */}
      <div className="mt-8 mb-8">
        <button
          onClick={() => {
            // 1. 기존에 저장된 정보가 있으면 삭제
            const existingData = localStorage.getItem('savedMediaSearch');
            if (existingData) {
              try {
                const parsedData = JSON.parse(existingData);
                console.log('🗑️ 기존 저장된 정보 발견, 삭제 중:', parsedData);
                localStorage.removeItem('savedMediaSearch');
                console.log('✅ 기존 저장된 정보 삭제 완료');
              } catch (error) {
                console.error('❌ 기존 저장된 정보 파싱 실패:', error);
                localStorage.removeItem('savedMediaSearch'); // 강제 삭제
              }
            }
            
            // 2. 현재 검색 결과가 있으면 저장
            if (searchResult?.data) {
              const dataToSave = {
                company_id: searchResult.data.company_id,
                search_period: {
                  start_date: searchResult.data.search_period.start_date,
                  end_date: searchResult.data.search_period.end_date
                },
                articles: searchResult.data.articles,
                total_results: searchResult.data.total_results,
                data: {
                  excel_filename: excelFilename,
                  excel_base64: excelBase64
                },
                timestamp: new Date().toISOString()
              };
              
              // 새로운 검색 결과 저장
              try {
                localStorage.setItem('savedMediaSearch', JSON.stringify(dataToSave));
                console.log('💾 새로운 검색 결과 저장 완료:', dataToSave);
                
                // 저장 확인
                const savedData = localStorage.getItem('savedMediaSearch');
                if (savedData) {
                  console.log('✅ localStorage 저장 확인 성공');
                  
                  // Zustand store에도 검색 결과 저장
                  setCompanyId(searchResult.data.company_id);
                  setSearchPeriod({
                    start_date: searchResult.data.search_period.start_date,
                    end_date: searchResult.data.search_period.end_date
                  });
                  
                  alert('✅ 검색 결과가 성공적으로 저장되었습니다.');
                } else {
                  console.error('❌ localStorage 저장 확인 실패');
                  alert('❌ 검색 결과 저장에 실패했습니다.');
                }
              } catch (error) {
                console.error('❌ localStorage 저장 중 오류:', error);
                alert('❌ 검색 결과 저장 중 오류가 발생했습니다.');
              }
            } else {
              alert('❌ 저장할 검색 결과가 없습니다.');
            }
          }}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          검색 결과 저장하기
        </button>
      </div>

      {searchResult.data?.articles && searchResult.data.articles.length > 8 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              📰 전체 검색 결과 ({searchResult.data.articles.length}개)
            </h3>
            <button
              onClick={() => setIsFullResultCollapsed(!isFullResultCollapsed)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <span>{isFullResultCollapsed ? '펼치기' : '접기'}</span>
              <span className="text-lg">{isFullResultCollapsed ? '▼' : '▲'}</span>
            </button>
          </div>

          {!isFullResultCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {searchResult.data.articles.map((article: any, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => {
                    if (article.originallink) {
                      window.open(article.originallink, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">
                      {article.pubDate
                        ? new Date(article.pubDate)
                            .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                            .replace(/\. /g, '. ')
                            .replace(/\.$/, '.')
                        : '날짜 없음'}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">🏷️검색 키워드:</span> {article.issue || '일반'}
                    </div>
                  </div>

                  <h4
                    className="font-medium text-gray-800 mb-2 text-sm leading-tight"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {article.title}
                  </h4>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="mr-1">🏢</span>
                      {article.company || '기업명 없음'}
                    </span>
                    {article.original_category && (
                      <span className="flex items-center">
                        <span className="mr-1">📂</span>
                        {article.original_category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResult;
