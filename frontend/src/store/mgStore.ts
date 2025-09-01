// frontend/src/store/mgStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MGIndexDTO, GRIIndex } from '@/lib/mg';
import { fetchMGIndexes, requestMGPolish } from '@/lib/mg';

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

  /** 선택 세트 저장 */
  setSelected: (items: IssuePool[]) => void;

  /** 서버에서 인덱스 로드(외부지표는 프론트에서 빈 배열 보정) */
  loadIndexes: () => Promise<void>;

  /**
   * 선택된 인덱스들 윤문 실행
   * - 인자로 payload를 주면 그것만 실행
   * - 생략하면 "숨기지 않은" 현재 스토어 상태 기준으로 실행
   */
  runPolish: (sessionKey: string, threadId: string, items?: MGIndexDTO[]) => Promise<void>;

  /** 이슈풀 단위로 인덱스 숨기기/복원 */
  excludeIndex: (issuepoolId: number, griIndex: string) => void;
  undoExclude: (issuepoolId: number, griIndex: string) => void;

  /** 렌더 편의를 위한 셀렉터: 숨기지 않은 인덱스만 반환 */
  visibleIndexesSelector: (issuepoolId: number) => GRIIndex[];

  /** 윤문 실행용 페이로드 빌더: 숨긴 인덱스를 제거해 MGIndexDTO 배열 생성 */
  getVisiblePayload: () => MGIndexDTO[];
};

export const useMGStore = create<MGState>()(
  persist(
    (set, get) => ({
      selected: [],
      indexesByIssue: {},
      resultsByIndex: {},
      excludedByIssue: {},

      setSelected: (items) => set({ selected: items }),

      loadIndexes: async () => {
        const sel = get().selected;

        // 1) issuepool 기반으로 간주할 최소 스키마
        const issuepoolCandidates = sel.filter((i) => Number.isFinite(i.id) && i.id > 0);

        // 2) "외부 지표"로 취급: 순위/연도 등이 비어 있을 수 있음
        const externalCandidates = sel.filter(
          (i) =>
            !issuepoolCandidates.find((j) => j.id === i.id) ||
            i.ranking == null ||
            i.publish_year == null
        );

        const grouped: Record<number, MGIndexDTO> = {};

        // 3) issuepool만 모아서 API 호출
        if (issuepoolCandidates.length) {
          try {
            const ids = issuepoolCandidates.map((i) => i.id);
            const items = await fetchMGIndexes(ids);

            for (const item of items) {
              grouped[item.issuepool_id] = item; // 정상 응답만 반영
            }
          } catch (e) {
            console.error('fetchMGIndexes 실패:', e);
            // 실패해도 진행 (외부 지표 보정 및 UI는 계속 동작)
          }
        }

        // 4) 외부 지표는 프론트에서 "빈 인덱스"로 보정해 UI가 멈추지 않도록
        for (const ext of externalCandidates) {
          if (!grouped[ext.id]) {
            grouped[ext.id] = {
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

        set({ indexesByIssue: grouped });
      },

      excludeIndex: (issuepoolId, griIndex) => {
        const map = { ...get().excludedByIssue };
        const setForIssue = new Set(map[issuepoolId] ?? []);
        setForIssue.add(griIndex);
        map[issuepoolId] = Array.from(setForIssue);
        set({ excludedByIssue: map });
      },

      undoExclude: (issuepoolId, griIndex) => {
        const map = { ...get().excludedByIssue };
        const setForIssue = new Set(map[issuepoolId] ?? []);
        setForIssue.delete(griIndex);
        map[issuepoolId] = Array.from(setForIssue);
        set({ excludedByIssue: map });
      },

      visibleIndexesSelector: (issuepoolId) => {
        const dto = get().indexesByIssue[issuepoolId];
        if (!dto?.gri_indexes?.length) return [];
        const excluded = new Set(get().excludedByIssue[issuepoolId] ?? []);
        return dto.gri_indexes.filter((g) => !excluded.has(g.gri_index));
      },

      getVisiblePayload: () => {
        const { indexesByIssue, excludedByIssue } = get();
        const payload: MGIndexDTO[] = [];

        for (const [issueIdStr, dto] of Object.entries(indexesByIssue)) {
          const issueId = Number(issueIdStr);
          const excluded = new Set(excludedByIssue[issueId] ?? []);
          const visible = (dto.gri_indexes || []).filter((g) => !excluded.has(g.gri_index));
          payload.push({ ...dto, gri_indexes: visible });
        }
        return payload;
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
          };
        }
        set({ resultsByIndex: next });
      },
    }),
    { name: 'taeheon-mg' }
  )
);
