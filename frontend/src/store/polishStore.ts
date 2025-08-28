import { create } from 'zustand';
import { GRIApiService } from '@/lib/griApi';

type Status = 'idle' | 'loading' | 'success' | 'error';

type PolishState = {
  status: Status;
  result?: {
    polished_text: string;
    meta: {
      session_key?: string;
      gri_index?: string;
      model?: string;
      created_at?: string;
    };
  };
  error?: string;
  savedAt?: string;
  // 실행(POST)
  polish: (args: Parameters<typeof GRIApiService.runPolish>[0]) => Promise<void>;
  // 조회(GET)
  fetchPolishResult: (sessionKey: string, griIndex: string) => Promise<void>;
  setSavedAt: (timestamp: string) => void;
  reset: () => void;
};

export const usePolishStore = create<PolishState>((set) => ({
  status: 'idle',
  result: undefined,
  error: undefined,
  savedAt: undefined,

  fetchPolishResult: async (sessionKey, griIndex) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.getPolishResult(sessionKey, griIndex); // 📖 GET
      if (!data) {
        set({ status: 'error', error: '저장된 윤문 결과가 없습니다.' });
        return;
      }
      set({ status: 'success', result: data });
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'load failed';
      set({ status: 'error', error });
    }
  },

  polish: async (args) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.runPolish(args);      // ✅ POST
      set({ status: 'success', result: data });
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'polish failed';
      set({ status: 'error', error });
    }
  },

  setSavedAt: (timestamp: string) => set({ savedAt: timestamp }),
  
  reset: () => set({ status: 'idle', result: undefined, error: undefined, savedAt: undefined }),
}));