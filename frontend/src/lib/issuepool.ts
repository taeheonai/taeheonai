// frontend/src/lib/api/issuepool.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://taeheonai-production-2130.up.railway.app/api';

export interface IssuePool {
  id: number;
  corporation_id: number;
  publish_year: string;
  ranking: string;
  issue_pool: string;
  category_id: number;
  esg_classification_id: number;
}

export interface IssuePoolCreateRequest {
  corporation_id: number;
  publish_year: string;
  ranking: string;
  issue_pool: string;
  category_id: number;
  esg_classification_id: number;
}

export interface IssuePoolUpdateRequest {
  corporation_id: number;
  publish_year: string;
  ranking: string;
  issue_pool: string;
  category_id: number;
  esg_classification_id: number;
}

export interface IssuePoolFilter {
  corporation_id?: number;
  publish_year?: string;
  category_id?: number;
  esg_classification_id?: number;
}

// IssuePool API 클래스
export class IssuePoolAPI {
  private static baseURL = `${API_BASE_URL}/v1/materiality`;

  // 랜덤 IssuePool 10개 조회 (새로운 엔드포인트)
  static async getRandomIssuePools(limit: number = 10): Promise<IssuePool[]> {
    try {
      const response = await axios.get(`${this.baseURL}/random/${limit}`);
      return response.data;
    } catch (error) {
      console.error('랜덤 IssuePool 조회 실패:', error);
      throw error;
    }
  }

  // 기존 API 메서드들
  static async createIssuePool(data: IssuePoolCreateRequest): Promise<IssuePool> {
    const response = await axios.post(this.baseURL, data);
    return response.data;
  }

  static async getIssuePool(id: number): Promise<IssuePool> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  static async updateIssuePool(id: number, data: IssuePoolUpdateRequest): Promise<IssuePool> {
    const response = await axios.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  static async deleteIssuePool(id: number): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  static async getIssuePoolsByCorporationAndYear(
    corporationId: number, 
    publishYear: string
  ): Promise<IssuePool[]> {
    const response = await axios.get(
      `${this.baseURL}/corporation/${corporationId}/year/${publishYear}`
    );
    return response.data;
  }

  static async getFilteredIssuePools(filter: IssuePoolFilter): Promise<IssuePool[]> {
    const response = await axios.post(`${this.baseURL}/filter`, filter);
    return response.data;
  }

  static async bulkCreateIssuePools(data: IssuePoolCreateRequest[]): Promise<IssuePool[]> {
    const response = await axios.post(`${this.baseURL}/bulk`, data);
    return response.data;
  }
}

