'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GRIItem } from '@/types/gri';

type GriState = {
  sessionKey: string | null;
  selectedCategoryId: number | null;
  selectedItemId: number | null;
  selectedItem: GRIItem | null;
  answers: Record<string, string>;
  lastSavedAt: string | undefined;
  companyname: string | undefined;
  setSessionKey: (k: string) => void;
  setSelected: (catId: number, itemId: number) => void;
  setSelectedItem: (item: GRIItem | null) => void;
  setAnswer: (qid: string, val: string) => void;
  setAnswers: (answers: Record<string, string>) => void;
  setBulkAnswers: (a: Record<string, string>) => void;
  resetItemAnswers: () => void;
  setCompanyName: (companyname: string) => void;
  getCompanyName: () => string | undefined;
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
      lastSavedAt: undefined,
      companyname: undefined,

      setSessionKey: (k) => set({ sessionKey: k }),
      setSelected: (catId, itemId) => set({ selectedCategoryId: catId, selectedItemId: itemId }),
      setSelectedItem: (item: GRIItem | null) => set({ selectedItem: item }),
      setAnswer: (qid, val) => set({ 
        answers: { ...get().answers, [qid]: val },
        lastSavedAt: new Date().toISOString()
      }),
      setAnswers: (answers) => set({ answers }),
      setBulkAnswers: (a) => set({ 
        answers: { ...get().answers, ...a },
        lastSavedAt: new Date().toISOString()
      }),
      resetItemAnswers: () => set({ answers: {} }),
      setCompanyName: (companyname: string) => set({ companyname }),
      getCompanyName: () => get().companyname,
      resetAll: () => set({ 
        sessionKey: null, 
        selectedCategoryId: null, 
        selectedItemId: null,
        selectedItem: null,
        answers: {}, 
        lastSavedAt: undefined,
        companyname: undefined
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
        lastSavedAt: state.lastSavedAt,
        companyname: state.companyname,
      }),
      version: 2, // polishedByIndex 제거를 위한 버전 업데이트
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion < 2) {
          // v1 -> v2: polishedByIndex 제거
          if (persisted && typeof persisted === 'object' && persisted !== null && 'state' in persisted) {
            const state = (persisted as { state: Record<string, unknown> }).state;
            if (state && 'polishedByIndex' in state) {
              delete state.polishedByIndex;
              console.log('🗑️ gri-storage.polishedByIndex 제거 완료');
            }
          }
        }
        return persisted;
      },
    }
  )
);