import React, { ChangeEvent } from 'react';
import { handleClearSearch } from '../handle_clear_search';
import { handleCompanySelect } from '../handle_company_select';
import { handleMediaSearch } from '../handle_media_search';

interface MediaSearchProps {
  companyId: string;
  companySearchTerm: string;
  searchPeriod: { start_date: string; end_date: string };
  isCompanyLoading: boolean;
  isMediaSearching: boolean;
  companies: string[];
  filteredCompanies: string[];
  isCompanyDropdownOpen: boolean;
  setCompanyId: (id: string) => void;
  setCompanySearchTerm: (term: string) => void;
  setSearchPeriod: (period: { start_date: string; end_date: string }) => void;
  setIsCompanyDropdownOpen: (open: boolean) => void;
  setSearchResult: (result: any) => void;
  setExcelFilename: (filename: string) => void;
  setExcelBase64: (base64: string) => void;
  setLoading: (loading: boolean) => void;
}

const MediaSearch: React.FC<MediaSearchProps> = ({
  companyId,
  companySearchTerm,
  searchPeriod,
  isCompanyLoading,
  isMediaSearching,
  companies,
  filteredCompanies,
  isCompanyDropdownOpen,
  setCompanyId,
  setCompanySearchTerm,
  setSearchPeriod,
  setIsCompanyDropdownOpen,
  setSearchResult,
  setExcelFilename,
  setExcelBase64,
  setLoading
}) => {
  const handleCompanySearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCompanySearchTerm(e.target.value);
  };

  return (
    <div id="media-search" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          🔍 미디어 검색
        </h2>
        <button
          onClick={() => {
            const savedSearch = localStorage.getItem('savedMediaSearch');
            if (savedSearch) {
              try {
                const savedData = JSON.parse(savedSearch);
                setCompanyId(savedData.company_id);
                setCompanySearchTerm(savedData.company_id);
                setSearchPeriod({
                  start_date: savedData.search_period.start_date,
                  end_date: savedData.search_period.end_date
                });
                console.log('Loading from localStorage:', {
                  ...savedData,
                  excel_base64: savedData.excel_base64 ? 'exists' : 'missing'
                });
                
                const searchResultData = {
                  success: true,
                  data: {
                    company_id: savedData.company_id,
                    search_period: savedData.search_period,
                    articles: savedData.articles,
                    total_results: savedData.total_results
                  }
                };
                setSearchResult(searchResultData);

                // 검색 결과에서 받은 엑셀 파일 정보를 그대로 사용
                if (savedData.data?.excel_filename && savedData.data?.excel_base64) {
                  setExcelFilename(savedData.data.excel_filename);
                  setExcelBase64(savedData.data.excel_base64);
                  console.log('Excel data loaded from search result');
                } else {
                  console.log('No excel data in search result');
                }
                alert('✅ 이전 검색 정보를 성공적으로 불러왔습니다.');
              } catch (error) {
                console.error('저장된 검색 결과를 불러오는데 실패했습니다:', error);
                alert('❌ 이전 검색 정보를 불러오는데 실패했습니다.');
              }
            } else {
              alert('저장된 이전 검색 정보가 없습니다.');
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          이전 검색 정보 불러오기
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative company-dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            기업 선택
          </label>
          <div className="relative">
            <input
              type="text"
              value={companySearchTerm}
              onChange={handleCompanySearchChange}
              onFocus={() => setIsCompanyDropdownOpen(true)}
              placeholder={isCompanyLoading ? "🔄 기업 목록을 불러오는 중..." : "기업명을 입력하거나 선택하세요"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                companyId ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}
              disabled={isCompanyLoading || isMediaSearching}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {companySearchTerm && (
                <button
                  type="button"
                  onClick={() => handleClearSearch(setCompanySearchTerm, setIsCompanyDropdownOpen)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="검색어 지우기"
                >
                  ✕
                </button>
              )}
              <button
                name='company-dropdown-button'
                type="button"
                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                disabled={isMediaSearching}
                className={`text-gray-400 hover:text-gray-600 ${
                  isMediaSearching ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {isCompanyDropdownOpen ? '▲' : '▼'}
              </button>
            </div>
          </div>
        
          {/* 드롭다운 목록 */}
          {isCompanyDropdownOpen && !isCompanyLoading && companies.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCompanies.length === 0 ? (
                <div className="px-4 py-2 text-gray-500 text-sm">
                  검색 결과가 없습니다
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <button
                    key={company}
                    type="button"
                    onClick={() => handleCompanySelect(company, setCompanyId, setCompanySearchTerm, setIsCompanyDropdownOpen)}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                      company === companyId ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {company}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            보고기간
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={searchPeriod.start_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchPeriod({ ...searchPeriod, start_date: e.target.value })}
                disabled={isMediaSearching}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  searchPeriod.start_date ? 'text-gray-900 font-medium' : 'text-gray-500'
                } ${isMediaSearching ? 'cursor-not-allowed opacity-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={searchPeriod.end_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchPeriod({ ...searchPeriod, end_date: e.target.value })}
                disabled={isMediaSearching}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  searchPeriod.end_date ? 'text-gray-900 font-medium' : 'text-gray-500'
                } ${isMediaSearching ? 'cursor-not-allowed opacity-50' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 미디어 검색 시작 버튼 */}
      <div className="mt-6">
        <button
          onClick={() => handleMediaSearch(companyId, searchPeriod, setLoading, setSearchResult, setExcelFilename, setExcelBase64)}
          disabled={isMediaSearching}
          className={`w-full py-3 px-6 rounded-lg transition-colors duration-200 font-medium text-lg flex items-center justify-center space-x-2 ${
            isMediaSearching 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isMediaSearching ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>미디어 검색 중...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>미디어 검색 시작</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MediaSearch;
