import api from './api';

import type {
  GRICategory,
  GRICompleteData,
  AnswerCreate,
  AnswerResponse,
  ProgressResponse,
  PolishRequest,
  PolishResponse,
  APIError
} from '@/types/gri';

// Re-export types that are used in other files
export type { 
  GRIQuestion, 
  GRIItem,
  PolishRequest,
  PolishResponse 
} from '@/types/gri';

// GRI API 서비스 클래스
export class GRIApiService {
  // 카테고리 목록 조회
  static async getCategories(): Promise<{ categories: GRICategory[]; count: number }> {
    try {
      const response = await api.get('/v1/gri/categories');
      return response.data;
    } catch (error) {
      console.error('카테고리 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 완전한 GRI 데이터 조회
  static async getCompleteData(categoryId: number): Promise<GRICompleteData> {
    try {
      const response = await api.get(`/v1/gri/complete/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('GRI 데이터 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : 'GRI 데이터 조회 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 답변 생성
  static async createAnswer(answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.post('/v1/gri/answers', answerData);
      return response.data;
    } catch (error) {
      console.error('답변 생성 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '답변 생성 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 진행률 조회
  static async getProgress(sessionKey: string): Promise<ProgressResponse> {
    try {
      const response = await api.get(`/v1/gri/progress/${sessionKey}`);
      return response.data;
    } catch (error) {
      console.error('진행률 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '진행률 조회 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 답변 목록 조회
  static async getAnswers(sessionKey?: string, page: number = 1, size: number = 10) {
    try {
      const params = { page, size };
      if (sessionKey) {
        Object.assign(params, { session_key: sessionKey });
      }
      
      const response = await api.get('/v1/gri/answers', { params });
      return response.data;
    } catch (error) {
      console.error('답변 목록 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '답변 목록 조회 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 답변 수정
  static async updateAnswer(answerId: number, answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.put(`/v1/gri/answers/${answerId}`, answerData);
      return response.data;
    } catch (error) {
      console.error('답변 수정 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '답변 수정 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 답변 삭제
  static async deleteAnswer(answerId: number): Promise<{ deleted_id: number }> {
    try {
      const response = await api.delete(`/v1/gri/answers/${answerId}`);
      return response.data;
    } catch (error) {
      console.error('답변 삭제 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '답변 삭제 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  // 답변 윤문
  static async polish(request: PolishRequest): Promise<PolishResponse> {
    try {
      const response = await api.post('/v1/gri/polish', request);
      
      // 응답 데이터 검증 및 변환
      const data = response.data;
      if (!data || !data.status || !data.data || typeof data.data.polished_text !== 'string') {
        console.debug('[polish] unexpected shape:', data);
        throw new Error('Unexpected polish response shape');
      }

      return data;
    } catch (error) {
      console.error('윤문 요청 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '윤문 요청 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  /**
   * 특정 GRI 인덱스의 윤문 결과를 조회합니다.
   * @param sessionKey - 세션 키
   * @param griIndex - GRI 인덱스 (예: "2-1", "3-2")
   */
  static async getPolishResult(sessionKey: string, griIndex: string): Promise<PolishResponse> {
    try {
      const response = await api.get(`/v1/gri/polish/${sessionKey}/${griIndex}`);
      const data = response.data;
      
      if (!data || !data.status || !data.data || typeof data.data.polished_text !== 'string') {
        console.debug('[getPolishResult] unexpected shape:', data);
        throw new Error('Unexpected polish result shape');
      }

      return data;
    } catch (error) {
      console.error('윤문 결과 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '윤문 결과를 가져오는데 실패했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }

  /**
   * 세션의 모든 윤문 결과 목록을 조회합니다.
   * @param sessionKey - 세션 키
   */
  static async listPolishResults(sessionKey: string) {
    try {
      const response = await api.get(`/v1/gri/polish/${sessionKey}`);
      return response.data;
    } catch (error) {
      console.error('윤문 결과 목록 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '윤문 결과 목록을 가져오는데 실패했습니다.',
        status: (error as { response?: { status: number } }).response?.status
      };
      throw apiError;
    }
  }
}

export default GRIApiService;