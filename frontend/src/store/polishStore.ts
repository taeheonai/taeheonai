import { create } from 'zustand';
import { GRIApiService } from '@/lib/griApi';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

// 🔧 에러 응답 타입 정의
interface ErrorResponse {
  response?: {
    status: number;
    data?: unknown;
  };
  message?: string;
}

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

    // ✅ 배치 업데이트: loading 상태만 먼저 설정
    set({ status: 'loading', error: undefined });
    
    try {
      const response = await GRIApiService.getPolishResult(sessionKey, griIndex); // 📖 GET
      
      // ✅ 결과에 따라 한 번에 상태 업데이트 (다중 set 방지)
      if (response.exists && response.data) {
        set({ 
          status: 'success', 
          result: response.data, 
          error: undefined 
        });
      } else {
        // ✅ 데이터가 없는 경우를 정상 상태로 처리
        set({ 
          status: 'not_found', 
          error: '아직 윤문 결과가 없습니다. 윤문을 실행해주세요.',
          result: undefined 
        });
      }
    } catch (e: unknown) {
      console.error('윤문 결과 조회 실패:', e);
      
      // 🔧 기존 404 에러 처리 로직 유지 (하위 호환성)
      if (e && typeof e === 'object' && 'response' in e) {
        const errorResponse = e as ErrorResponse;
        if (errorResponse.response?.status === 404) {
          set({ 
            status: 'not_found', 
            error: '아직 윤문 결과가 없습니다. 윤문을 실행해주세요.',
            result: undefined 
          });
          return;
        }
      }
      
      // ✅ 기타 에러는 한 번에 상태 업데이트
      const error = e instanceof Error ? e.message : '윤문 결과 조회에 실패했습니다.';
      set({ 
        status: 'error', 
        error, 
        result: undefined 
      });
    }
  },

  polish: async (args) => {
    set({ status: 'loading', error: undefined });
    try {
      const data = await GRIApiService.runPolish(args);      // ✅ POST
      set({ status: 'success', result: data, error: undefined });
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'polish failed';
      set({ status: 'error', error, result: undefined });
    }
  },

  setSavedAt: (timestamp: string) => set({ savedAt: timestamp }),
  
  reset: () => set({ status: 'idle', result: undefined, error: undefined, savedAt: undefined }),
}));