import api from './api';

import type {
  GRICategory,
  GRICompleteData,
  AnswerCreate,
  AnswerResponse,
  ProgressResponse,
  PolishRequest,
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

  // 안전한 정규화기
  private static normalizePolish(raw: {
    polished_text?: string;
    data?: {
      polished_text?: string;
    };
    result?: string;
    session_key?: string;
    gri_index?: string;
    model?: string;
    created_at?: string;
  }): {
    polished_text: string;
    meta: {
      session_key?: string;
      gri_index?: string;
      model?: string;
      created_at?: string;
    };
  } {
    return {
      polished_text: raw?.polished_text ?? raw?.data?.polished_text ?? raw?.result ?? '',
      meta: {
        session_key: raw?.session_key,
        gri_index: raw?.gri_index,
        model: raw?.model,
        created_at: raw?.created_at,
      }
    };
  }

  // ✅ 실행(POST): 답변과 함께 윤문을 돌림
  static async runPolish(request: PolishRequest) {
    try {
      const { data } = await api.post('/v1/gri/polish', request);
      return this.normalizePolish(data);
    } catch (error: unknown) {
      console.error('윤문 요청 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '윤문 요청 중 오류가 발생했습니다.',
        status: (error as { response?: { status: number } })?.response?.status
      };
      throw apiError;
    }
  }

  // 📖 조회(GET): 저장/캐시된 윤문을 불러옴
  static async getPolishResult(sessionKey: string, griIndex: string) {
    try {
      const { data } = await api.get(`/v1/gri/polish/${sessionKey}/${griIndex}`);
      return this.normalizePolish(data);
    } catch (error: unknown) {
      if ((error as { response?: { status: number } })?.response?.status === 404) {
        return null; // 데이터가 없는 경우
      }
      console.error('윤문 결과 조회 오류:', error);
      const apiError: APIError = {
        message: error instanceof Error ? error.message : '윤문 결과를 가져오는데 실패했습니다.',
        status: (error as { response?: { status: number } })?.response?.status
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