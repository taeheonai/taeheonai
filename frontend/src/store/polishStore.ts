import { create } from 'zustand';
import { GRIApiService, type PolishRequest, type PolishResponse } from '@/lib/griApi';

type Status = 'idle' | 'loading' | 'success' | 'error';

type PolishState = {
  status: Status;
  result?: PolishResponse;
  error?: string;
  savedAt?: string;
  fetchPolishResult: (sessionKey: string, griIndex: string) => Promise<void>;
  polish: (args: PolishRequest) => Promise<void>;
  setSavedAt: (timestamp: string) => void;
  reset: () => void;
};

export const usePolishStore = create<PolishState>((set) => ({
  status: 'idle',
  result: undefined,
  error: undefined,
  savedAt: undefined,

  fetchPolishResult: async (sessionKey: string, griIndex: string) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.getPolishResult(sessionKey, griIndex);
      set({ status: 'success', result: data });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '윤문 결과를 불러오는데 실패했습니다';
      set({ status: 'error', error: errorMessage });
    }
  },

  polish: async (args) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.polish(args);
      set({ status: 'success', result: data });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '윤문 요청 중 오류가 발생했습니다';
      set({ status: 'error', error: errorMessage });
    }
  },

  setSavedAt: (timestamp: string) => set({ savedAt: timestamp }),
  
  reset: () => set({ status: 'idle', result: undefined, error: undefined, savedAt: undefined }),
}));