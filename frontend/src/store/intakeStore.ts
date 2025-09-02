'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type QA = {
  answer_text: string;
  polished_text?: string;
  display_mode?: 'prose' | 'table';
};

type SavedItem = {
  gri_index: string;                    // e.g., '205-1'
  category_id?: number;
  answers: Record<string, QA>;          // '1','2','3' 키로 통일
  polished_text?: string;               // 문항 전체 polished(선택)
  last_modified?: string;
};

type IntakeState = {
  corporation_id?: number;
  companyname?: string;
  sessionKey?: string;
  savedItems: Record<string, SavedItem>; // {'205-1': {...}}
  setCorp: (id: number, name?: string) => void;
  setSessionKey: (k: string) => void;
  setCompanyName: (name: string) => void;
  saveItem: (griIndex: string, patch: Partial<SavedItem>) => void;
  saveQA: (griIndex: string, qNo: string, qa: QA) => void;
  setAnswer: (griIndex: string, qNo: string, answer: string) => void;
  setAnswers: (griIndex: string, answers: Record<string, string>) => void;
  getSavedItem: (griIndex: string) => SavedItem | undefined;
  clear: () => void;
  _hasHydrated: boolean;
};

const letterToNo: Record<string, string> = { a:'1', b:'2', c:'3', d:'4', e:'5', f:'6' };

export const useIntakeStore = create<IntakeState>()(
  persist(
    (set, get) => ({
      corporation_id: undefined,
      companyname: undefined,
      sessionKey: undefined,
      savedItems: {},
      _hasHydrated: false,
      
      setCorp: (id, name) => set({ corporation_id: id, companyname: name }),
      setSessionKey: (k) => set({ sessionKey: k }),
      setCompanyName: (name) => set({ companyname: name }),
      saveItem: (griIndex, patch) =>
        set((s) => ({
          savedItems: {
            ...s.savedItems,
            [griIndex]: {
              ...(s.savedItems[griIndex] ?? { gri_index: griIndex, answers: {} }),
              ...patch,
              last_modified: new Date().toISOString(),
            },
          },
        })),
      saveQA: (griIndex, qNo, qa) =>
        set((s) => {
          const item = s.savedItems[griIndex] ?? { gri_index: griIndex, answers: {} };
          return {
            savedItems: {
              ...s.savedItems,
              [griIndex]: {
                ...item,
                answers: {
                  ...item.answers,
                  [qNo]: qa,
                },
                last_modified: new Date().toISOString(),
              },
            },
          };
        }),
      setAnswer: (griIndex, qNo, answer) =>
        set((s) => {
          const item = s.savedItems[griIndex] ?? { gri_index: griIndex, answers: {} };
          return {
            savedItems: {
              ...s.savedItems,
              [griIndex]: {
                ...item,
                answers: {
                  ...item.answers,
                  [qNo]: {
                    ...item.answers[qNo],
                    answer_text: answer,
                  },
                },
                last_modified: new Date().toISOString(),
              },
            },
          };
        }),
      setAnswers: (griIndex: string, answers: Record<string, string>) =>
        set((s) => {
          const item = s.savedItems[griIndex] ?? { gri_index: griIndex, answers: {} };
          const normalizedAnswers: Record<string, QA> = {};
          
          // string을 QA 객체로 변환
          for (const [key, value] of Object.entries(answers)) {
            normalizedAnswers[key] = {
              answer_text: value,
              polished_text: '',
              display_mode: 'prose',
            };
          }
          
          return {
            savedItems: {
              ...s.savedItems,
              [griIndex]: {
                ...item,
                answers: {
                  ...item.answers,
                  ...normalizedAnswers,
                },
                last_modified: new Date().toISOString(),
              },
            },
          };
        }),
      getSavedItem: (griIndex) => get().savedItems[griIndex],
      clear: () => set({ savedItems: {}, corporation_id: undefined, companyname: undefined, sessionKey: undefined }),
    }),
    {
      // ★ SSOT 키: 기존 polish-storage를 그대로 쓰고 싶으면 name을 'polish-storage'로 유지
      name: 'polish-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2, // ★ 마이그레이션 트리거
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      migrate: (persisted: unknown) => {
        // v1 -> v2 마이그레이션:
        // - answers 키가 a/b/c면 1/2/3으로 바꿈
        // - report-storage의 savedAnswers를 병합(있으면)
        try {
          if (!persisted || typeof persisted !== 'object' || !('state' in persisted)) return persisted;

          const st = (persisted as { state: Record<string, unknown> }).state;
          const savedItems = (st.savedItems as Record<string, unknown>) ?? {};

          // 1) polish-storage 내부 answers 정규화
          for (const idx of Object.keys(savedItems)) {
            const item = savedItems[idx] as Record<string, unknown>;
            if (!item) continue;
            const normalized: Record<string, QA> = {};
            const src = (item.answers as Record<string, unknown>) ?? {};
            for (const k of Object.keys(src)) {
              const nk = letterToNo[k] ?? k; // 'a'→'1'
              normalized[nk] = src[k] as QA;
            }
                         (item as Record<string, unknown>).answers = normalized;
            // polished_text 유지
          }

          // 2) report-storage 합치기(있다면)
          const reportRaw = localStorage.getItem('report-storage');
          if (reportRaw) {
            const report = JSON.parse(reportRaw);
            const rState = report?.state;
            const rSaved = rState?.gri?.savedAnswers ?? {};
                      for (const idx of Object.keys(rSaved)) {
            const qaMap = rSaved[idx] as Record<string, unknown>;
            const normalized: Record<string, QA> = {};
                          for (const qNo of Object.keys(qaMap)) {
              const qa = qaMap[qNo] as Record<string, unknown>;
              normalized[String(qNo)] = {
                answer_text: (qa?.answer_text as string) ?? '',
                polished_text: (qa?.polished_text as string) ?? '',
                display_mode: ((qa?.display_mode as string) ?? 'prose') as 'prose' | 'table',
              };
            }
                          const exist = (savedItems[idx] as Record<string, unknown>) ?? { gri_index: idx, answers: {} };
                         (savedItems as Record<string, unknown>)[idx] = {
              ...exist,
              answers: { ...(exist.answers as Record<string, unknown>), ...normalized },
              last_modified: new Date().toISOString(),
            };
            }
            // 필요시 report-storage 제거(선택)
            // localStorage.removeItem('report-storage');
          }

          st.savedItems = savedItems;
          return { ...persisted, state: st };
        } catch {
          return persisted;
        }
      },
    }
  )
);
