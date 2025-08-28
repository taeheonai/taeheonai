import { create } from 'zustand';
import { GRIApiService, type PolishResponse, type PolishRequest } from '@/lib/griApi';

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
      // ✅ 결과 저장 → 리렌더 트리거
      set({ status: 'success', result: data });
    } catch (e: any) {
      set({ status: 'error', error: e?.message ?? 'unknown error' });
    }
  },

  reset: () => set({ status: 'idle', result: undefined, error: undefined }),
}));