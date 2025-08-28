import api from './api';

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

// 윤문 관련 인터페이스
export interface PolishRequest {
  session_key: string;
  gri_index: string;
  item_title: string;
  answers: Array<{
    question_id: number;
    key_alpha: string;
    text: string;
  }>;
  prompt_profile?: string;
}

// 새로운 통합 윤문 응답 타입
export interface PolishResponse {
  draft: string;                 // 윤문 결과 본문
  citations?: string[];          // 선택
  meta: {
    session_key: string;
    gri_index: string;
    prompt_profile?: string;
    model?: string;
    created_at?: string;
  };
}

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
      throw this.createError(error, '카테고리 조회 중 오류가 발생했습니다.');
    }
  }

  // 완전한 GRI 데이터 조회
  static async getCompleteData(categoryId: number): Promise<GRICompleteData> {
    try {
      const response = await api.get(`/v1/gri/complete/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('GRI 데이터 조회 오류:', error);
      throw this.createError(error, 'GRI 데이터 조회 중 오류가 발생했습니다.');
    }
  }

  // 답변 생성
  static async createAnswer(answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.post('/v1/gri/answers', answerData);
      return response.data;
    } catch (error) {
      console.error('답변 생성 오류:', error);
      throw this.createError(error, '답변 생성 중 오류가 발생했습니다.');
    }
  }

  // 진행률 조회
  static async getProgress(sessionKey: string): Promise<ProgressResponse> {
    try {
      const response = await api.get(`/v1/gri/progress/${sessionKey}`);
      return response.data;
    } catch (error) {
      console.error('진행률 조회 오류:', error);
      throw this.createError(error, '진행률 조회 중 오류가 발생했습니다.');
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
      throw this.createError(error, '답변 목록 조회 중 오류가 발생했습니다.');
    }
  }

  // 답변 수정
  static async updateAnswer(answerId: number, answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.put(`/v1/gri/answers/${answerId}`, answerData);
      return response.data;
    } catch (error) {
      console.error('답변 수정 오류:', error);
      throw this.createError(error, '답변 수정 중 오류가 발생했습니다.');
    }
  }

  // 답변 삭제
  static async deleteAnswer(answerId: number): Promise<{ deleted_id: number }> {
    try {
      const response = await api.delete(`/v1/gri/answers/${answerId}`);
      return response.data;
    } catch (error) {
      console.error('답변 삭제 오류:', error);
      throw this.createError(error, '답변 삭제 중 오류가 발생했습니다.');
    }
  }

  // 답변 윤문
  static async polish(request: PolishRequest): Promise<PolishResponse> {
    try {
      const response = await api.post('/v1/gri/polish', request);
      
      // 응답 데이터 검증 및 변환
      const data = response.data;
      if (!data || typeof data.polished_text !== 'string') {
        console.debug('[polish] unexpected shape:', data);
        throw new Error('Unexpected polish response shape');
      }

      // 기존 응답을 새로운 형식으로 변환
      return {
        draft: data.polished_text,
        meta: {
          session_key: request.session_key,
          gri_index: request.gri_index,
          model: data.model,
          created_at: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('윤문 요청 오류:', error);
      throw this.createError(error, '윤문 요청 중 오류가 발생했습니다.');
    }
  }

  // 에러 생성 헬퍼 메서드
  private static createError(error: unknown, defaultMessage: string): APIError {
    return {
      message: error instanceof Error ? error.message : defaultMessage,
      status: (error as { response?: { status: number } }).response?.status,
      detail: error instanceof Error ? error.stack : undefined
    };
  }
}

export default GRIApiService;