import api from './api';

export interface PolishResult {
  status: string;
  data: {
    session_key: string;
    gri_index: string;
    polished_text: string;
    sources: Array<{
      requirement: string;
      hash: string;
    }>;
    model: string;
    input_tokens: number;
    output_tokens: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * 특정 GRI 인덱스의 윤문 결과를 조회합니다.
 * @param sessionKey - 세션 키
 * @param griIndex - GRI 인덱스 (예: "2-1", "3-2")
 * @returns 윤문된 텍스트와 메타데이터를 포함한 결과
 * @throws {Error} 윤문 결과 조회 실패 시 에러
 */
export const getPolishResult = async (sessionKey: string, griIndex: string): Promise<PolishResult> => {
  try {
    const response = await api.get(`/v1/gri/polish/${sessionKey}/${griIndex}`);
    return response.data;
  } catch (error) {
    throw new Error(`윤문 결과를 가져오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

/**
 * 세션의 모든 윤문 결과 목록을 조회합니다.
 * @param sessionKey - 세션 키
 * @returns 해당 세션의 모든 윤문 결과 목록
 * @throws {Error} 윤문 결과 목록 조회 실패 시 에러
 */
export const listPolishResults = async (sessionKey: string) => {
  try {
    const response = await api.get(`/v1/gri/polish/${sessionKey}`);
    return response.data;
  } catch (error) {
    throw new Error(`윤문 결과 목록을 가져오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};