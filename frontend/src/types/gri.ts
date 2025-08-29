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

// 답변 관련 인터페이스
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
  extra_instructions?: string;
}

export interface PolishResponse {
  status: string;
  data: {
    polished_text: string;
    model?: string;
    created_at?: string;
  };
}

// 🔧 새로운 응답 구조: exists 플래그 기반
export interface PolishEnvelope {
  exists: boolean;
  data: PolishResponse | null;
  message?: string;
}

export interface APIError {
  message: string;
  status?: number;
  detail?: string;
}