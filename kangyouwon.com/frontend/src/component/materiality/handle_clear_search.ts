// 검색어 초기화 (검색 필드 클리어)
export const handleClearSearch = (setCompanySearchTerm: any, setIsCompanyDropdownOpen: any) => {
  setCompanySearchTerm('');
  setIsCompanyDropdownOpen(false);
};