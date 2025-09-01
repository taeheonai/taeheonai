import axios from 'axios';

export interface CompanyInfo {
  corporation_id: string;
  corporation_name: string;
  // 필요한 다른 회사 정보 필드들...
}

export const AuthApiService = {
  async getCompanyInfo(corporationId: string): Promise<CompanyInfo> {
    try {
      const response = await axios.get(`/api/v1/auth/corporations/${corporationId}`);
      return response.data;
    } catch (error) {
      console.error('회사 정보 조회 실패:', error);
      throw error;
    }
  }
};
