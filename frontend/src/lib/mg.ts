// frontend/src/lib/api/mg.ts
import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://taeheonai-production-2130.up.railway.app/api';

const api = axios.create({ baseURL: API_BASE_URL });

/** ---------- 기존 타입 ---------- */
export type GRIIndex = {
  gri_id: number;
  gri_index: string;
  frequency: number;
  grade: 'A' | 'B' | 'C';
};

export type MGIndexDTO = {
  issuepool_id: number;
  issue_pool: string;
  ranking: string;
  publish_year: string;
  corporation_id: number;
  category_id: number;
  esg_classification_id: number;
  gri_indexes: GRIIndex[];
};

/** ---------- 신규: 질문 조회/윤문 타입 ---------- */
export type MGQuestion = {
  id: number;
  key_alpha?: string | null;
  text: string;
  order: number;
};

export type MGIndexBlock = {
  gri_index: string;
  item_id: number;
  item_title?: string | null;
  frequency?: number | null;
  grade?: 'A' | 'B' | 'C' | null;
  questions: MGQuestion[];
};

export type MGIndexResponse = {
  category_id: number;
  indexes: MGIndexBlock[];
};

export type PolishIndexPayload = {
  session_key: string;
  category_id: number;
  gri_index: string;
  // 둘 중 하나만 보내면 됨 (answers_by_key 권장)
  answers_by_key?: Record<string, string>;
  answers_by_id?: { question_id: number; raw_answer: string }[];

  // 옵션 메타
  thread_id?: string;
  corporation_id?: number;
  style?: string;
  audience?: string;
  references?: string[];
  extra_meta?: Record<string, unknown>;
};

export type PolishedSubAnswer = {
  question_id: number;
  key_alpha?: string;
  polished_text: string;
};

export type PolishIndexResponse = {
  session_key: string;
  gri_index: string;
  item_id: number;
  item_title?: string;
  polished_index_text?: string;
  items: PolishedSubAnswer[];
};

/** ---------- 기존 함수들(유지) ---------- */
export async function fetchMGIndexes(issuepoolIds: number[]): Promise<MGIndexDTO[]> {
  const clean = issuepoolIds.map(Number).filter(Number.isFinite);
  const { data } = await api.post('/v1/materiality/mg/indexes', { issuepool_ids: clean });
  return data.items;
}

/**
 * ⚠️ 레거시: 백엔드 /mg/polish 는 MGIndexDTO[] 입력을 기대함.
 * 현재 시그니처는 GRIIndex[]였는데, 기존 코드와의 호환을 위해 남겨둡니다.
 * 가능한 한 새 인덱스 단위 윤문(polishIndex)을 사용하세요.
 */
export async function requestMGPolish(sessionKey: string, threadId: string, items: MGIndexDTO[]) {
  const { data } = await api.post('/v1/materiality/mg/polish', items, {
    headers: { 'X-Session-Key': sessionKey, 'X-Thread-Id': threadId },
  });
  return data;
}

/** ---------- 신규: 질문 조회 ---------- */
export async function fetchQuestionsByCategory(categoryId: number): Promise<MGIndexResponse> {
  const { data } = await api.get('/v1/materiality/mg/questions', {
    params: { category_id: categoryId },
  });
  return data as MGIndexResponse;
}

export async function fetchIndexQuestions(categoryId: number, griIndex: string): Promise<MGIndexBlock> {
  const { data } = await api.get('/v1/materiality/mg/questions/index', {
    params: { category_id: categoryId, gri_index: griIndex },
  });
  return data as MGIndexBlock;
}

/** ---------- 신규: 인덱스 단위(a,b,c...) 한 번에 윤문 ---------- */
export async function polishIndex(payload: PolishIndexPayload): Promise<PolishIndexResponse> {
  const { data } = await api.post('/v1/materiality/mg/polish/index', payload);
  return data as PolishIndexResponse;
}
