import { create } from 'zustand';
import { GRIApiService, type PolishResponse, type PolishRequest, type APIError } from '@/lib/griApi';

type Status = 'idle' | 'loading' | 'success' | 'error';

type PolishState = {
  status: Status;
  result?: PolishResponse;
  error?: string;
  run: (args: PolishRequest) => Promise<void>;
  reset: () => void;
};

export const usePolishStore = create<PolishState>((set) => ({
  status: 'idle',
  result: undefined,
  error: undefined,

  run: async (args) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.polish(args);
      set({ status: 'success', result: data });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as APIError)?.message ?? '알 수 없는 오류가 발생했습니다';
      set({ status: 'error', error: errorMessage });
    }
  },

  reset: () => set({ status: 'idle', result: undefined, error: undefined }),
}));