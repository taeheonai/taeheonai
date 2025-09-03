// 기업 선택 처리
export const handleCompanySelect = (company: string, setCompanyId: any, setCompanySearchTerm: any, setIsCompanyDropdownOpen: any) => {
  setCompanyId(company);
  setCompanySearchTerm(company);
  setIsCompanyDropdownOpen(false);
};