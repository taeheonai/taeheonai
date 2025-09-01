import axios from 'axios';

export interface CompanyInfo {
  id: string;
  name: string;
  // 필요한 다른 회사 정보 필드들...
}

export const AuthApiService = {
  async getCompanyInfo(companyId: string): Promise<CompanyInfo> {
    try {
      const response = await axios.get(`/api/v1/auth/companies/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('회사 정보 조회 실패:', error);
      throw error;
    }
  }
};
