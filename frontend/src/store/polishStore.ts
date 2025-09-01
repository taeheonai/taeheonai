import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

// 저장된 윤문 결과 타입
type PolishedItem = {
  gri_index: string;
  category_id: number;
  polished_text: string;
  last_modified: string;
  answers: {
    [key: string]: string;  // key_alpha를 키로 사용
  };
};

type PolishState = {
  status: Status;
  result?: {
    polished_text: string;
    model?: string;
    created_at?: string;
  };
  error?: string;
  savedAt?: string;
  // Local Storage 관련
  savedItems: { [key: string]: PolishedItem };  // gri_index를 키로 사용
  // API 관련
  polish: (args: Parameters<typeof GRIApiService.runPolish>[0]) => Promise<void>;
  fetchPolishResult: (sessionKey: string, griIndex: string) => Promise<void>;
  // Local Storage 관련 메서드
  savePolishedItem: (item: PolishedItem) => void;
  getPolishedItem: (gri_index: string) => PolishedItem | undefined;
  getAllPolishedItems: () => PolishedItem[];
  // 기타
  setSavedAt: (timestamp: string) => void;
  reset: () => void;
};

export const usePolishStore = create<PolishState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      result: undefined,
      error: undefined,
      savedAt: undefined,
      savedItems: {},

      fetchPolishResult: async (sessionKey, griIndex) => {
        const currentState = get();
        if (currentState.status === 'loading') {
          console.log('🔄 이미 로딩 중, 중복 요청 방지');
          return;
        }
        
        if (currentState.result && 
            currentState.result.model === sessionKey && 
            currentState.result.created_at === griIndex) {
          console.log('✅ 이미 결과가 있음, API 호출 생략');
          return;
        }

        set({ status: 'loading', error: undefined });
        
        try {
          const response = await GRIApiService.getPolishResult(sessionKey, griIndex);
          
          if (response.exists && response.data) {
            set({ 
              status: 'success', 
              result: response.data, 
              error: undefined 
            });
          } else {
            set({ 
              status: 'not_found', 
              error: '아직 윤문 결과가 없습니다. 윤문을 실행해주세요.',
              result: undefined 
            });
          }
        } catch (e: unknown) {
          console.error('윤문 결과 조회 실패:', e);
          
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
          const data = await GRIApiService.runPolish(args);
          set({ status: 'success', result: data, error: undefined });
        } catch (e: unknown) {
          const error = e instanceof Error ? e.message : 'polish failed';
          set({ status: 'error', error, result: undefined });
        }
      },

      setSavedAt: (timestamp: string) => set({ savedAt: timestamp }),
      
      reset: () => set((state) => ({ 
        status: 'idle', 
        result: undefined, 
        error: undefined, 
        savedAt: undefined,
        savedItems: state.savedItems
      })),

      savePolishedItem: (item) => set((state) => ({
        savedItems: {
          ...state.savedItems,
          [item.gri_index]: {
            ...item,
            last_modified: new Date().toISOString(),
          },
        },
      })),

      getPolishedItem: (gri_index) => get().savedItems[gri_index],

      getAllPolishedItems: () => Object.values(get().savedItems),
    }),
    {
      name: 'polish-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ savedItems: state.savedItems }),
    }
  )
);