// frontend/src/store/mgStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MGIndexDTO, GRIIndex, MGQuestion } from '@/lib/mg';
import { fetchMGIndexes, fetchMGCategoryIndexes, requestMGPolish, fetchQuestionsByItemId } from '@/lib/mg';

type IssuePool = {
  id: number;
  corporation_id?: number;
  publish_year?: string | null;
  ranking?: string | null;
  issue_pool: string;
  category_id: number;
  esg_classification_id?: number;
};

type PolishResultState = {
  polished_text?: string;
  status: 'idle' | 'loading' | 'done' | 'error';
  savedAt?: string;
  // ESG 카테고리 분류를 위한 추가 필드
  category_id?: number;
  esg_classification_id?: number;
};

type MGState = {
  /** Materiality 페이지에서 전달된 이슈풀들 */
  selected: IssuePool[];

  /** 이슈풀ID -> MGIndexDTO (인덱스 리스트 포함) */
  indexesByIssue: Record<number, MGIndexDTO>;

  /** gri_index -> 실행/결과 상태 */
  resultsByIndex: Record<string, PolishResultState>;

  /** 이슈풀ID -> 숨긴 gri_index[] */
  excludedByIssue: Record<number, string[]>;

  /** item_id -> 질문 목록 */
  questionsByItem: Record<number, MGQuestion[]>;

  /** 선택 세트 저장 */
  setSelected: (items: IssuePool[]) => void;

  /** 최종 이슈풀 데이터 저장 (materiality 페이지에서 전달) */
  setFinalIssuepools: (issuepools: IssuePool[]) => void;

  /** 서버에서 인덱스 로드(외부지표는 프론트에서 빈 배열 보정) */
  loadIndexes: () => Promise<void>;

  /**
   * 선택된 인덱스들 윤문 실행
   * - 인자로 payload를 주면 그것만 실행
   * - 생략하면 "숨기지 않은" 현재 스토어 상태 기준으로 실행
   */
  runPolish: (sessionKey: string, threadId: string, items?: MGIndexDTO[]) => Promise<void>;

  /** 카테고리 단위로 인덱스 숨기기/복원 */
  excludeIndex: (categoryId: number, griIndex: string) => void;
  undoExclude: (categoryId: number, griIndex: string) => void;

  /** item_id로 질문들 로드 */
  loadQuestionsByItemId: (itemId: number) => Promise<void>;

  /** 렌더 편의를 위한 셀렉터: 숨기지 않은 인덱스만 반환 */
  visibleIndexesSelector: (categoryId: number) => GRIIndex[];

  /** 윤문 실행용 페이로드 빌더: 숨긴 인덱스를 제거해 MGIndexDTO 배열 생성 */
  getVisiblePayload: () => MGIndexDTO[];

  /** 단일 인덱스 결과 업데이트 */
  updateSingleIndexResult: (griIndex: string, result: PolishResultState, categoryId?: number, esgClassificationId?: number) => void;

  /** ESG별로 분류된 인덱스 셀렉터 */
  getESGIndexes: () => {
    environmental: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }>;
    social: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }>;
    governance: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }>;
  };

  /** 특정 ESG 카테고리의 인덱스만 반환 */
  getIndexesByESG: (esgType: 'E' | 'S' | 'G') => Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }>;
};

export const useMGStore = create<MGState>()(
  persist(
    (set, get) => ({
      selected: [],
      indexesByIssue: {},
      resultsByIndex: {},
      excludedByIssue: {},
      questionsByItem: {},

      setSelected: (items) => set({ selected: items }),

      setFinalIssuepools: (issuepools) => {
        console.log('🎯 최종 이슈풀 데이터 저장:', issuepools);
        set({ selected: issuepools });
      },

      loadIndexes: async () => {
        const sel = get().selected;
        console.log('🔍 loadIndexes 시작 - selected 데이터:', sel);

        // 1) 카테고리 기반으로 GRI 인덱스 조회
        const categoryIds = sel.map((i) => i.category_id).filter(Number.isFinite);
        console.log('🔍 추출된 categoryIds:', categoryIds);
        
        const grouped: Record<number, MGIndexDTO> = {};

        // 2) 카테고리 기반 API 호출
        if (categoryIds.length) {
          try {
            console.log('🔍 fetchMGCategoryIndexes API 호출 시작:', categoryIds);
            const items = await fetchMGCategoryIndexes(categoryIds);
            console.log('✅ fetchMGCategoryIndexes API 응답:', items);

            for (const item of items) {
              grouped[item.category_id] = item; // 카테고리 ID로 그룹화
              console.log(`✅ 카테고리 ${item.category_id} 데이터 저장:`, item);
            }
          } catch (e) {
            console.error('❌ fetchMGCategoryIndexes 실패:', e);
            // 실패해도 진행 (외부 지표 보정 및 UI는 계속 동작)
          }
        }

        // 3) 외부 지표는 프론트에서 "빈 인덱스"로 보정해 UI가 멈추지 않도록
        for (const ext of sel) {
          if (!grouped[ext.category_id]) {
            console.log(`⚠️ 카테고리 ${ext.category_id}에 대한 데이터가 없어 빈 배열로 설정`);
            grouped[ext.category_id] = {
              issuepool_id: ext.id,
              issue_pool: ext.issue_pool,
              category_id: ext.category_id,
              esg_classification_id: ext.esg_classification_id || 0,
              corporation_id: ext.corporation_id || 0,
              publish_year: ext.publish_year || '',
              ranking: ext.ranking || '',
              gri_indexes: [], // 표시용으로 빈 배열
            } as MGIndexDTO;
          }
        }

        console.log('🔍 최종 grouped 데이터:', grouped);
        set({ indexesByIssue: grouped });
      },

      excludeIndex: (categoryId, griIndex) => {
        const map = { ...get().excludedByIssue };
        const setForCategory = new Set(map[categoryId] ?? []);
        setForCategory.add(griIndex);
        map[categoryId] = Array.from(setForCategory);
        set({ excludedByIssue: map });
      },

      undoExclude: (categoryId, griIndex) => {
        const map = { ...get().excludedByIssue };
        const setForCategory = new Set(map[categoryId] ?? []);
        setForCategory.delete(griIndex);
        map[categoryId] = Array.from(setForCategory);
        set({ excludedByIssue: map });
      },

      visibleIndexesSelector: (categoryId) => {
        const dto = get().indexesByIssue[categoryId];
        if (!dto?.gri_indexes?.length) return [];
        const excluded = new Set(get().excludedByIssue[categoryId] ?? []);
        return dto.gri_indexes.filter((g) => !excluded.has(g.gri_index));
      },

      getVisiblePayload: () => {
        const { indexesByIssue, excludedByIssue } = get();
        const payload: MGIndexDTO[] = [];

        for (const [categoryIdStr, dto] of Object.entries(indexesByIssue)) {
          const categoryId = Number(categoryIdStr);
          const excluded = new Set(excludedByIssue[categoryId] ?? []);
          const visible = (dto.gri_indexes || []).filter((g) => !excluded.has(g.gri_index));
          payload.push({ ...dto, gri_indexes: visible });
        }
        return payload;
      },

      updateSingleIndexResult: (griIndex, result, categoryId, esgClassificationId) => {
        set((state) => ({
          resultsByIndex: {
            ...state.resultsByIndex,
            [griIndex]: {
              ...result,
              // ESG 정보가 제공되면 추가, 없으면 기존 값 유지
              category_id: categoryId ?? result.category_id,
              esg_classification_id: esgClassificationId ?? result.esg_classification_id,
            },
          },
        }));
      },

      /** ESG별로 분류된 인덱스 셀렉터 */
      getESGIndexes: () => {
        const state = get();
        const environmental: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }> = [];
        const social: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }> = [];
        const governance: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }> = [];

        // 각 인덱스의 결과와 이슈풀 정보를 매칭
        for (const [griIndex, result] of Object.entries(state.resultsByIndex)) {
          if (result.status === 'done' && result.polished_text) {
            // 해당 인덱스가 속한 이슈풀 찾기
            const issuePool = state.selected.find(issue => 
              state.indexesByIssue[issue.id]?.gri_indexes.some(idx => idx.gri_index === griIndex)
            );

            const finalEsgId = result.esg_classification_id || issuePool?.esg_classification_id;
            
            console.log('🔍 ESG 분류 체크:', {
              griIndex,
              resultEsgId: result.esg_classification_id,
              issuePoolEsgId: issuePool?.esg_classification_id,
              finalEsgId,
              issuePool: issuePool?.issue_pool,
              hasIssuePool: !!issuePool,
              willBeClassifiedAs: finalEsgId === 4 ? 'Environmental' : 
                                 finalEsgId === 1 ? 'Social' : 
                                 (finalEsgId === 2 || finalEsgId === 3) ? 'Governance' : 'Unknown'
            });

            if (issuePool) {
              const item = { griIndex, result, issuePool };
              
              // ESG 분류에 따라 배열에 추가 (esg_classification_id가 없으면 이슈풀의 값 사용)
              const esgId = result.esg_classification_id || issuePool.esg_classification_id;
              
              switch (esgId) {
                case 1: // 사회 (Social)
                  social.push(item);
                  break;
                case 2: // 지배구조 (Governance)
                  governance.push(item);
                  break;
                case 3: // 지배구조/경제 → 지배구조 (Governance)
                  governance.push(item);
                  break;
                case 4: // 환경 (Environmental)
                  environmental.push(item);
                  break;
                default:
                  // ESG 분류가 없으면 환경으로 기본 분류
                  environmental.push(item);
                  break;
              }
            }
          }
        }

        return { environmental, social, governance };
      },

      /** 특정 ESG 카테고리의 인덱스만 반환 */
      getIndexesByESG: (esgType) => {
        const state = get();
        const result: Array<{ griIndex: string; result: PolishResultState; issuePool: IssuePool }> = [];

        for (const [griIndex, polishResult] of Object.entries(state.resultsByIndex)) {
          if (polishResult.status === 'done' && polishResult.polished_text) {
            const issuePool = state.selected.find(issue => 
              state.indexesByIssue[issue.id]?.gri_indexes.some(idx => idx.gri_index === griIndex)
            );

            if (issuePool) {
              // ESG 분류 ID 가져오기 (결과에서 가져오거나 이슈풀에서 가져오기)
              const esgId = polishResult.esg_classification_id || issuePool.esg_classification_id;
              
              let shouldInclude = false;
              
              switch (esgType) {
                case 'E':
                  shouldInclude = esgId === 4; // 환경
                  break;
                case 'S':
                  shouldInclude = esgId === 1; // 사회
                  break;
                case 'G':
                  shouldInclude = esgId === 2 || esgId === 3; // 지배구조 또는 지배구조/경제
                  break;
              }

              if (shouldInclude) {
                result.push({ griIndex, result: polishResult, issuePool });
              }
            }
          }
        }

        return result;
      },

      runPolish: async (sessionKey, threadId, items) => {
        // items가 주어지면 그대로, 아니면 숨김 인덱스를 제외한 현재 상태를 사용
        const payload: MGIndexDTO[] = items ?? get().getVisiblePayload();

        // 상태 갱신용 인덱스 리스트
        const idxList = payload.flatMap((item) => item.gri_indexes || []);

        const patch: Record<string, { status: 'loading' }> = {};
        idxList.forEach((i) => {
          patch[`${i.gri_index}`] = { status: 'loading' };
        });
        set({ resultsByIndex: { ...get().resultsByIndex, ...patch } });

        const res = await requestMGPolish(sessionKey, threadId, payload);
        const next = { ...get().resultsByIndex };
        for (const r of res.results ?? []) {
          next[r.gri_index] = {
            status: 'done',
            polished_text: r.polished_text,
            savedAt: new Date().toISOString(),
            // ESG 정보 추가 (기본값으로 설정)
            category_id: r.category_id || 4,
            esg_classification_id: r.category_id || 4,
          };
        }
        set({ resultsByIndex: next });
      },

      loadQuestionsByItemId: async (itemId: number) => {
        try {
          console.log(`🔍 item_id ${itemId}의 질문들 로드 시작`);
          const questions = await fetchQuestionsByItemId(itemId);
          console.log(`✅ item_id ${itemId}의 질문 ${questions.length}개 로드 완료:`, questions);
          
          set((state) => ({
            questionsByItem: {
              ...state.questionsByItem,
              [itemId]: questions
            }
          }));
        } catch (error) {
          console.error(`❌ item_id ${itemId}의 질문 로드 실패:`, error);
        }
      },
    }),
    { name: 'taeheon-mg' }
  )
);

