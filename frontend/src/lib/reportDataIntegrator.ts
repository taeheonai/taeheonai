/**
 * Report 페이지에서 두 입력 경로의 데이터를 통합하는 유틸리티
 * 기존 코드와 기능을 보존하면서 데이터 통합만 담당
 */

import type { SavedAnswers } from '@/types/gri';

// MG 페이지에서 저장된 데이터 타입
export interface MGPolishResult {
  polished_text?: string;
  status: 'idle' | 'loading' | 'done' | 'error';
  savedAt?: string;
}

export interface MGStoreData {
  resultsByIndex: Record<string, MGPolishResult>;
}

// GRI Intake에서 저장된 데이터 타입
export interface IntakeAnswer {
  answer_text: string;
  polished_text?: string;
  display_mode?: 'prose' | 'table';
}

export interface IntakeStoreData {
  savedItems: Record<string, {
    gri_index: string;
    answers: Record<string, IntakeAnswer>;
    polished_text?: string;
    last_modified?: string;
  }>;
}

// 통합된 답변 데이터 타입
export interface IntegratedAnswer {
  source: 'mg' | 'intake' | 'server';
  answer_text?: string;
  polished_text?: string;
  display_mode?: 'prose' | 'table';
  last_modified?: string | null | undefined;
  status?: 'idle' | 'loading' | 'done' | 'error';
  // 로컬 데이터에서 추가로 필요한 필드들
  gri_index?: string;
  category_id?: number;
  answers?: Record<string, any>;
  version?: number;
}

export interface IntegratedAnswers {
  [griIndex: string]: {
    [questionKey: string]: IntegratedAnswer;
  };
}

/**
 * 두 입력 경로의 데이터를 통합하여 Report 페이지에서 표시할 수 있도록 변환
 * @param mgData - MG 페이지 스토리지 데이터
 * @param intakeData - GRI Intake 스토리지 데이터
 * @param serverData - 서버에서 가져온 데이터
 * @returns 통합된 답변 데이터
 */
export function integrateReportData(
  mgData: MGStoreData | null,
  intakeData: IntakeStoreData | null,
  serverData: SavedAnswers | null
): IntegratedAnswers {
  const integrated: IntegratedAnswers = {};

  // 1. MG 페이지 데이터 통합 (우선순위: 높음)
  if (mgData?.resultsByIndex) {
    for (const [griIndex, result] of Object.entries(mgData.resultsByIndex)) {
      if (result.status === 'done' && result.polished_text) {
        if (!integrated[griIndex]) {
          integrated[griIndex] = {};
        }
        
        // MG는 전체 인덱스에 대한 윤문 결과를 제공
        const savedAt = result.savedAt || null;
        integrated[griIndex]['mg_result'] = {
          source: 'mg',
          polished_text: result.polished_text,
          last_modified: savedAt,
          status: result.status
        };
      }
    }
  }

  // 2. GRI Intake 데이터 통합 (우선순위: 중간)
  if (intakeData?.savedItems) {
    for (const [griIndex, item] of Object.entries(intakeData.savedItems)) {
      if (!integrated[griIndex]) {
        integrated[griIndex] = {};
      }

      // 개별 질문 답변
      for (const [questionKey, answer] of Object.entries(item.answers)) {
        integrated[griIndex][questionKey] = {
          source: 'intake',
          answer_text: answer.answer_text,
          polished_text: answer.polished_text,
          display_mode: answer.display_mode,
          last_modified: item.last_modified
        };
      }

      // 전체 인덱스 윤문 결과
      if (item.polished_text) {
        integrated[griIndex]['intake_result'] = {
          source: 'intake',
          polished_text: item.polished_text,
          last_modified: item.last_modified
        };
      }
    }
  }

  // 3. 서버 데이터 통합 (우선순위: 낮음, 기존 데이터가 없을 때만)
  if (serverData) {
    for (const [griIndex, section] of Object.entries(serverData)) {
      if (!integrated[griIndex]) {
        integrated[griIndex] = {};
      }

      for (const [questionKey, answer] of Object.entries(section)) {
        // 이미 로컬 데이터가 있으면 서버 데이터는 덮어쓰지 않음
        if (!integrated[griIndex][questionKey]) {
          integrated[griIndex][questionKey] = {
            source: 'server',
            answer_text: answer.answer_text,
            polished_text: answer.polished_text ?? undefined,
            display_mode: answer.display_mode
          };
        }
      }
    }
  }

  return integrated;
}

/**
 * 특정 GRI 인덱스와 질문에 대한 최적의 답변을 선택
 * @param integratedData - 통합된 데이터
 * @param griIndex - GRI 인덱스
 * @param questionKey - 질문 키
 * @returns 최적의 답변 또는 null
 */
export function getBestAnswer(
  integratedData: IntegratedAnswers,
  griIndex: string,
  questionKey: string
): IntegratedAnswer | null {
  const indexData = integratedData[griIndex];
  if (!indexData) return null;

  // 1. 해당 질문의 직접 답변
  const directAnswer = indexData[questionKey];
  if (directAnswer) return directAnswer;

  // 2. MG 결과 (전체 인덱스 윤문)
  const mgResult = indexData['mg_result'];
  if (mgResult) return mgResult;

  // 3. Intake 결과 (전체 인덱스 윤문)
  const intakeResult = indexData['intake_result'];
  if (intakeResult) return intakeResult;

  return null;
}

/**
 * 데이터 소스별 우선순위를 고려한 표시 텍스트 생성
 * @param answer - 통합된 답변 데이터
 * @returns 표시할 텍스트
 */
export function getDisplayText(answer: IntegratedAnswer | null): string {
  if (!answer) return '—';

  // polished_text가 있으면 우선 사용
  if (answer.polished_text) {
    return answer.polished_text;
  }

  // answer_text가 있으면 사용
  if (answer.answer_text) {
    return answer.answer_text;
  }

  return '—';
}

/**
 * 데이터 소스별 배지 텍스트 생성
 * @param answer - 통합된 답변 데이터
 * @returns 배지 텍스트
 */
export function getSourceBadge(answer: IntegratedAnswer | null): string {
  if (!answer) return '';

  switch (answer.source) {
    case 'mg':
      return 'MG';
    case 'intake':
      return 'Intake';
    case 'server':
      return 'Server';
    default:
      return '';
  }
}

/**
 * 데이터 통합 상태 요약 정보 생성
 * @param integratedData - 통합된 데이터
 * @returns 통합 상태 요약
 */
export function getIntegrationSummary(integratedData: IntegratedAnswers) {
  const summary = {
    totalIndexes: Object.keys(integratedData).length,
    mgIndexes: 0,
    intakeIndexes: 0,
    serverIndexes: 0,
    mixedIndexes: 0,
    mgIndexList: [] as string[],
    intakeIndexList: [] as string[],
    serverIndexList: [] as string[],
    mixedIndexList: [] as string[]
  };

  for (const [griIndex, indexData] of Object.entries(integratedData)) {
    const sources = new Set(Object.values(indexData).map(answer => answer.source));
    
    if (sources.has('mg')) {
      summary.mgIndexes++;
      summary.mgIndexList.push(griIndex);
    }
    if (sources.has('intake')) {
      summary.intakeIndexes++;
      summary.intakeIndexList.push(griIndex);
    }
    if (sources.has('server')) {
      summary.serverIndexes++;
      summary.serverIndexList.push(griIndex);
    }
    
    if (sources.size > 1) {
      summary.mixedIndexes++;
      summary.mixedIndexList.push(griIndex);
    }
  }

  return summary;
}

/**
 * 특정 GRI 인덱스의 데이터 소스별 상태 확인
 * @param integratedData - 통합된 데이터
 * @param griIndex - GRI 인덱스
 * @returns 해당 인덱스의 데이터 소스별 상태
 */
export function getIndexSourceStatus(
  integratedData: IntegratedAnswers, 
  griIndex: string
) {
  const indexData = integratedData[griIndex];
  if (!indexData) return null;

  const status = {
    hasMG: false,
    hasIntake: false,
    hasServer: false,
    mgData: null as IntegratedAnswer | null,
    intakeData: null as IntegratedAnswer | null,
    serverData: null as IntegratedAnswer | null
  };

  for (const [key, answer] of Object.entries(indexData)) {
    switch (answer.source) {
      case 'mg':
        status.hasMG = true;
        if (key === 'mg_result') status.mgData = answer;
        break;
      case 'intake':
        status.hasIntake = true;
        if (key === 'intake_result') status.intakeData = answer;
        break;
      case 'server':
        status.hasServer = true;
        status.serverData = answer;
        break;
    }
  }

  return status;
}

/**
 * 데이터 충돌 감지 (같은 인덱스에 여러 소스의 데이터가 있는 경우)
 * @param integratedData - 통합된 데이터
 * @returns 충돌이 있는 인덱스 목록
 */
export function detectDataConflicts(integratedData: IntegratedAnswers): string[] {
  const conflicts: string[] = [];

  for (const [griIndex, indexData] of Object.entries(integratedData)) {
    const sources = new Set(Object.values(indexData).map(answer => answer.source));
    
    if (sources.size > 1) {
      conflicts.push(griIndex);
    }
  }

  return conflicts;
}
