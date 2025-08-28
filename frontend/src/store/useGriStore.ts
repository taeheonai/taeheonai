'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GRIItem } from '@/lib/griApi';

type Answers = Record<string /*question_id*/, string>;
type Polished = Record<string /*gri_index*/, string>;

type GriState = {
  sessionKey: string | null;
  selectedCategoryId: number | null;
  selectedItemId: number | null;
  selectedItem: GRIItem | null;
  answers: Answers;
  polishedByIndex: Polished;
  lastSavedAt?: string;

  setSessionKey: (k: string) => void;
  setSelected: (catId: number|null, itemId: number|null) => void;
  setSelectedItem: (item: GRIItem | null) => void;
  setAnswer: (qid: string, val: string) => void;
  setAnswers: (answers: Answers) => void;
  setBulkAnswers: (a: Answers) => void;
  setPolished: (indexNo: string, text: string) => void;
  resetItemAnswers: (itemId?: number|null) => void;
  resetAll: () => void;
};

export const useGriStore = create<GriState>()(
  persist(
    (set, get) => ({
      sessionKey: null,
      selectedCategoryId: null,
      selectedItemId: null,
      selectedItem: null,
      answers: {},
      polishedByIndex: {},
      lastSavedAt: undefined,

      setSessionKey: (k) => set({ sessionKey: k }),
      setSelected: (catId, itemId) => set({ selectedCategoryId: catId, selectedItemId: itemId }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      setAnswer: (qid, val) => set({ 
        answers: { ...get().answers, [qid]: val },
        lastSavedAt: new Date().toISOString()
      }),
      setAnswers: (answers) => set({ answers }),
      setBulkAnswers: (a) => set({ 
        answers: { ...get().answers, ...a },
        lastSavedAt: new Date().toISOString()
      }),
      setPolished: (idx, text) => set({ 
        polishedByIndex: { ...get().polishedByIndex, [idx]: text },
        lastSavedAt: new Date().toISOString()
      }),
      resetItemAnswers: () => set({ answers: {} }),
      resetAll: () => set({ 
        sessionKey: null, 
        selectedCategoryId: null, 
        selectedItemId: null,
        selectedItem: null,
        answers: {}, 
        polishedByIndex: {},
        lastSavedAt: undefined
      }),
    }),
    {
      name: 'gri-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionKey: state.sessionKey,
        selectedCategoryId: state.selectedCategoryId,
        selectedItemId: state.selectedItemId,
        selectedItem: state.selectedItem,
        answers: state.answers,
        polishedByIndex: state.polishedByIndex,
        lastSavedAt: state.lastSavedAt,
      }),
      version: 1,
    }
  )
);