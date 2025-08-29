// frontend/src/store/mgStore.ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MGIndexDTO, GRIIndex } from '@/lib/mg';
import { fetchMGIndexes, requestMGPolish } from '@/lib/mg';

type IssuePool = {
  id:number; corporation_id:number; publish_year:string; ranking:string;
  issue_pool:string; category_id:number; esg_classification_id:number;
};

type MGState = {
  selected: IssuePool[];
  indexesByIssue: Record<number, MGIndexDTO>;  // 새로운 구조: 단일 객체
  resultsByIndex: Record<string, { polished_text?: string; status: 'idle'|'loading'|'done'|'error'; savedAt?: string }>;
  setSelected: (items: IssuePool[]) => void;
  loadIndexes: () => Promise<void>;
  runPolish: (sessionKey: string, threadId: string, indices?: GRIIndex[]) => Promise<void>;
};

export const useMGStore = create<MGState>()(persist((set, get) => ({
  selected: [],
  indexesByIssue: {},
  resultsByIndex: {},
  setSelected: (items) => set({ selected: items }),

  loadIndexes: async () => {
    const ids = get().selected.map(i => i.id);
    if (!ids.length) return;
    const items = await fetchMGIndexes(ids);
    
    // 새로운 구조에 맞춰 그룹화: issuepool_id를 키로 하는 단일 객체
    const grouped: Record<number, MGIndexDTO> = {};
    for (const item of items) {
      grouped[item.issuepool_id] = item;
    }
    set({ indexesByIssue: grouped });
  },

  runPolish: async (sessionKey, threadId, indices) => {
    // indices가 없으면 모든 GRI 인덱스를 평면화
    const idx = indices ?? Object.values(get().indexesByIssue)
      .flatMap(item => item.gri_indexes || []);
    
    // 상태 표시
    const patch: Record<string, { status: 'loading' }> = {};
    idx.forEach(i => patch[`${i.gri_index}`] = { status: 'loading' });
    set({ resultsByIndex: { ...get().resultsByIndex, ...patch } });

    const res = await requestMGPolish(sessionKey, threadId, idx);
    // 응답 형태에 맞춰 저장
    const next = { ...get().resultsByIndex };
    for (const r of res.results ?? []) {
      next[r.gri_index] = { status: 'done', polished_text: r.polished_text, savedAt: new Date().toISOString() };
    }
    set({ resultsByIndex: next });
  },
}), { name: 'taeheon-mg' }));
