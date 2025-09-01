// frontend/src/store/mgStore.ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MGIndexDTO } from '@/lib/mg';
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

type MGState = {
  selected: IssuePool[];
  indexesByIssue: Record<number, MGIndexDTO>;  // 새로운 구조: 단일 객체
  resultsByIndex: Record<string, { polished_text?: string; status: 'idle'|'loading'|'done'|'error'; savedAt?: string }>;
  setSelected: (items: IssuePool[]) => void;
  loadIndexes: () => Promise<void>;
  runPolish: (sessionKey: string, threadId: string, items?: MGIndexDTO[]) => Promise<void>;
};

export const useMGStore = create<MGState>()(persist((set, get) => ({
  selected: [],
  indexesByIssue: {},
  resultsByIndex: {},
  setSelected: (items) => set({ selected: items }),

  loadIndexes: async () => {
    const sel = get().selected;

    // 1) issuepool 기반으로 간주할 최소 스키마
    const issuepoolCandidates = sel.filter(i =>
      Number.isFinite(i.id) && i.id > 0
    );

    // 2) "외부 지표"로 취급할 후보: 순위/연도 없는 케이스 등
    const externalCandidates = sel.filter(i =>
      !issuepoolCandidates.find(j => j.id === i.id) ||
      i.ranking == null || i.publish_year == null
    );

    const grouped: Record<number, MGIndexDTO> = {};

    // 3) issuepool만 모아서 API 호출
    if (issuepoolCandidates.length) {
      try {
        const ids = issuepoolCandidates.map(i => i.id);
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
          gri_indexes: [],     // 표시용으로 빈 배열
        } as MGIndexDTO;
      }
    }

    set({ indexesByIssue: grouped });
  },

  runPolish: async (sessionKey, threadId, items) => {
    // items가 없으면 현재 스토어의 issue 단위 데이터를 사용
    const payload: MGIndexDTO[] = items ?? Object.values(get().indexesByIssue);
    // 상태 표시를 위해 인덱스 목록 추출
    const idxList = payload.flatMap(item => item.gri_indexes || []);

    const patch: Record<string, { status: 'loading' }> = {};
    idxList.forEach(i => { patch[`${i.gri_index}`] = { status: 'loading' }; });
    set({ resultsByIndex: { ...get().resultsByIndex, ...patch } });

    const res = await requestMGPolish(sessionKey, threadId, payload);
    // 응답 형태에 맞춰 저장
    const next = { ...get().resultsByIndex };
    for (const r of res.results ?? []) {
      next[r.gri_index] = { status: 'done', polished_text: r.polished_text, savedAt: new Date().toISOString() };
    }
    set({ resultsByIndex: next });
  },
}), { name: 'taeheon-mg' }));
