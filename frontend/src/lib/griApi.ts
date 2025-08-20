import api from './axios';

// GRI 데이터 타입 정의
export interface GRICategory {
  id: number;
  code: string;
  title: string;
  display_order: number;
}

export interface GRIQuestion {
  id: number;
  key_alpha: string;
  question_text: string;
  reference_text: string | null;
  question_type: string;
  display_order: number;
  required: boolean;
}

export interface GRIItem {
  id: number;
  index_no: string;
  title: string;
  questions: GRIQuestion[];
}

export interface GRICompleteData {
  category: GRICategory;
  items: GRIItem[];
  item_count: number;
}

export interface AnswerCreate {
  question_id: number;
  session_key: string;
  answer_text: string;
  answer_json?: Record<string, unknown>;
}

export interface AnswerResponse {
  id: number;
  question_id: number;
  session_key: string;
  answer_text: string;
  answer_json?: Record<string, unknown>;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgressResponse {
  session_key: string;
  total_questions: number;
  completed_answers: number;
  progress_percentage: number;
}

// API 에러 타입 정의
export interface APIError {
  message: string;
  status?: number;
  detail?: string;
}

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
}

export default GRIApiService;
