import { create } from 'zustand';
import { getPolishResult, listPolishResults, type PolishResult } from '@/lib/api/gri';

interface PolishStore {
  polishResult: PolishResult | null;
  isLoading: boolean;
  error: string | null;
  fetchPolishResult: (sessionKey: string, griIndex: string) => Promise<void>;
  clearPolishResult: () => void;
}

export const usePolishStore = create<PolishStore>((set) => ({
  polishResult: null,
  isLoading: false,
  error: null,

  fetchPolishResult: async (sessionKey: string, griIndex: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await getPolishResult(sessionKey, griIndex);
      set({ polishResult: result, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '윤문 결과를 불러오는데 실패했습니다', isLoading: false });
    }
  },

  clearPolishResult: () => {
    set({ polishResult: null, error: null });
  },
}));
