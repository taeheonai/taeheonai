import api from './api';

import type {
  GRICategory,
  GRICompleteData,
  AnswerCreate,
  AnswerResponse,
  ProgressResponse,
  PolishRequest,
  APIError,
  GRIReportStructure,
  SavedAnswers
} from '@/types/gri';
import { safeParseCategories, safeParseGRICompleteData } from '@/lib/schemas';

// API 에러 응답 타입
interface ErrorResponse {
  response?: {
    status: number;
    data?: {
      detail?: string;
      message?: string;
    };
  };
  message?: string;
}

// Re-export types that are used in other files
export type { 
  GRIQuestion, 
  GRIItem,
  GRIItemExtended,
  GRIReportStructure,
  DisplayMode,
  SavedAnswers,
  PolishRequest,
  PolishResponse 
} from '@/types/gri';

// GRI API 서비스 클래스
export class GRIApiService {
  // 카테고리 목록 조회
  static async getCategories(): Promise<{ categories: GRICategory[]; count: number }> {
    try {
      const response = await api.get('/v1/gri/categories');
      // 스키마 검증 적용
      return safeParseCategories(response.data);
    } catch (error: unknown) {
      console.error('카테고리 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '알 수 없는 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // 완전한 GRI 데이터 조회
  static async getCompleteData(categoryId: number): Promise<GRICompleteData> {
    try {
      const response = await api.get(`/v1/gri/complete/${categoryId}`);
      // 스키마 검증 적용
      const parsedData = safeParseGRICompleteData(response.data);
      if (!parsedData) {
        throw new Error('GRI 데이터 파싱 실패');
      }
      return parsedData as GRICompleteData;
    } catch (error: unknown) {
      console.error('GRI 데이터 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || 'GRI 데이터 조회 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // 답변 생성
  static async createAnswer(answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.post('/v1/gri/answers', answerData);
      return response.data;
    } catch (error: unknown) {
      console.error('답변 생성 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '답변 생성 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // 진행률 조회
  static async getProgress(sessionKey: string): Promise<ProgressResponse> {
    try {
      const response = await api.get(`/v1/gri/progress/${sessionKey}`);
      return response.data;
    } catch (error: unknown) {
      console.error('진행률 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '진행률 조회 중 오류가 발생했습니다.',
        status: err.response?.status
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
    } catch (error: unknown) {
      console.error('답변 목록 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '답변 목록 조회 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // 답변 수정
  static async updateAnswer(answerId: number, answerData: AnswerCreate): Promise<AnswerResponse> {
    try {
      const response = await api.put(`/v1/gri/answers/${answerId}`, answerData);
      return response.data;
    } catch (error: unknown) {
      console.error('답변 수정 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '답변 수정 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // 답변 삭제
  static async deleteAnswer(answerId: number): Promise<{ deleted_id: number }> {
    try {
      const response = await api.delete(`/v1/gri/answers/${answerId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('답변 삭제 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '답변 삭제 중 오류가 발생했습니다.',
        status: err.response?.status
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
      // LLM 윤문은 시간이 오래 걸리므로 타임아웃을 60초로 설정
      const { data } = await api.post('/v1/gri/polish', request, { 
        timeout: 60000 // 60초로 상향
      });
      return this.normalizePolish(data);
    } catch (error: unknown) {
      // 타임아웃 에러인 경우 재시도
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNABORTED') {
        console.log('윤문 요청 타임아웃, 재시도 중...');
        try {
          const { data } = await api.post('/v1/gri/polish', request, { 
            timeout: 60000 
          });
          return this.normalizePolish(data);
        } catch (retryError: unknown) {
          console.error('윤문 재시도 실패:', retryError);
          const apiError: APIError = {
            message: retryError instanceof Error ? retryError.message : '윤문 재시도 중 오류가 발생했습니다.',
            status: (retryError as { response?: { status: number } })?.response?.status
          };
          throw apiError;
        }
      }
      
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
      return { exists: true, data: this.normalizePolish(data) };
    } catch (error: unknown) {
      if ((error as { response?: { status: number } })?.response?.status === 404) {
        // 🔧 404는 정상 상태: 아직 윤문 결과가 없음
        return { exists: false, data: null };
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
    } catch (error: unknown) {
      console.error('윤문 결과 목록 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || '윤문 결과 목록을 가져오는데 실패했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // GRI 리포트 관련 메서드들
  static async fetchReportStructure(corpId: number, corpName?: string) {
    try {
      const response = await api.get<GRIReportStructure>(
        `/v1/report/gri-report/structure/${corpId}`,
        { params: { companyname: corpName } }
      );
      return response.data;
    } catch (error: unknown) {
      console.error('GRI 리포트 구조 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'GRI 리포트 구조 조회 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  static async fetchReportAnswers(corpId: number) {
    try {
      const response = await api.get<SavedAnswers>(
        `/v1/report/gri-report/answers/${corpId}`
      );
      return response.data;
    } catch (error: unknown) {
      console.error('GRI 리포트 답변 조회 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || 'GRI 리포트 답변 조회 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  static async saveReportAnswers(corpId: number, answers: SavedAnswers) {
    try {
      await api.post(
        `/v1/report/gri-report/answers/${corpId}`,
        { answers }
      );
    } catch (error: unknown) {
      console.error('GRI 리포트 답변 저장 오류:', error);
      const err = error as ErrorResponse;
      const apiError: APIError = {
        message: err.response?.data?.message || err.response?.data?.detail || err.message || 'GRI 리포트 답변 저장 중 오류가 발생했습니다.',
        status: err.response?.status
      };
      throw apiError;
    }
  }

  // GRI Intake 페이지용 답변 저장 (ESG 분류 없음)
  // corporation_id가 없어도 로컬 저장은 가능
  static async saveIntakeAnswers(corpId: number | null, answers: SavedAnswers) {
    // corporation_id가 없으면 백엔드 저장 건너뛰기
    if (!corpId) {
      console.log('corporation_id가 없어 백엔드 저장을 건너뜁니다. 로컬 저장만 완료됩니다.');
      return;
    }
    
    try {
      await api.post(
        `/v1/report/gri-report/intake-answers/${corpId}`,
        { answers }
      );
    } catch (error: unknown) {
      console.error('GRI Intake 답변 저장 오류:', error);
      
      // 에러 응답을 더 자세히 분석
      const err = error as ErrorResponse;
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message;
      
      // 422 (Validation Error) 또는 400 (Bad Request)인 경우 더 자세한 메시지 제공
      if (status === 422 || status === 400) {
        const apiError: APIError = {
          message: `데이터 형식 오류: ${detail || '잘못된 데이터 구조입니다.'}`,
          status: status
        };
        throw apiError;
      }
      
      // 기타 에러는 그대로 전파
      throw error;
    }
  }

  // GRI Intake 페이지용 답변 조회 (ESG 분류 없음)
  // corporation_id가 없으면 빈 결과 반환
  static async fetchIntakeAnswers(corpId: number | null) {
    if (!corpId) {
      console.log('corporation_id가 없어 백엔드 조회를 건너뜁니다.');
      return { answers: {} };
    }
    
    try {
      const response = await api.get(
        `/v1/report/gri-report/intake-answers/${corpId}`
      );
      return response.data;
    } catch (error: unknown) {
      console.error('GRI Intake 답변 조회 오류:', error);
      throw error;
    }
  }

  // Materiality-GRI 페이지용 답변 조회 (ESG 분류 포함)
  static async fetchMaterialityAnswers(corpId: number) {
    try {
      const response = await api.get(
        `/v1/report/gri-report/answers/${corpId}`
      );
      return response.data;
    } catch (error: unknown) {
      console.error('Materiality-GRI 답변 조회 오류:', error);
      throw error;
    }
  }
}

export default GRIApiService;