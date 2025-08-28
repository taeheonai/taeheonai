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

export const usePolishStore = create<PolishState>((set, get) => ({
  status: 'idle',
  result: undefined,
  error: undefined,
  savedAt: undefined,

  fetchPolishResult: async (sessionKey, griIndex) => {
    // 🔧 이미 로딩 중이거나 같은 데이터를 요청 중이면 중복 호출 방지
    const currentState = get();
    if (currentState.status === 'loading') {
      console.log('🔄 이미 로딩 중, 중복 요청 방지');
      return;
    }
    
    // 🔧 이미 같은 결과가 있으면 API 호출하지 않음
    if (currentState.result && 
        currentState.result.meta?.session_key === sessionKey && 
        currentState.result.meta?.gri_index === griIndex) {
      console.log('✅ 이미 결과가 있음, API 호출 생략');
      return;
    }

    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.getPolishResult(sessionKey, griIndex); // 📖 GET
      if (!data) {
        set({ status: 'error', error: '저장된 윤문 결과가 없습니다.' });
        return;
      }
      set({ status: 'success', result: data });
    } catch (e: unknown) {
      console.error('윤문 결과 조회 실패:', e);
      
      // 🔧 404 에러는 정상적인 상황으로 처리
      if (e && typeof e === 'object' && 'response' in e) {
        const response = (e as any).response;
        if (response?.status === 404) {
          set({ status: 'error', error: '아직 윤문 결과가 없습니다. 윤문을 실행해주세요.' });
          return;
        }
      }
      
      const error = e instanceof Error ? e.message : '윤문 결과 조회에 실패했습니다.';
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