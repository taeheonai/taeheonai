import { create } from 'zustand';
import { Article, SearchPeriod } from "../app/lib/types";
import axios from 'axios';

interface MediaState {
  loading: boolean;
  error: string | null;
  companyId: string | null;
  searchPeriod: SearchPeriod;
  articles: Article[] | null;
  totalResults: number;

  // 상태 업데이트 메서드
  setCompanyId: (id: string) => void;
  setSearchPeriod: (period: SearchPeriod) => void;
  setLoading: (isLoading: boolean) => void;
  
  // 미디어 검색 메서드
  searchMedia: (payload?: { 
    company_id?: string;
    search_period?: SearchPeriod;
  }) => Promise<void>;
  
  // 상태 초기화
  reset: () => void;
}

const initialSearchPeriod = {
  start_date: '',
  end_date: ''
};

export const useMediaStore = create<MediaState>((set, get) => ({
  loading: false,
  error: null,
  companyId: null,
  searchPeriod: initialSearchPeriod,
  articles: null,
  totalResults: 0,

  setCompanyId: (id) => set({ companyId: id }),
  setSearchPeriod: (period) => set({ searchPeriod: period }),
  setLoading: (isLoading) => set({ loading: isLoading }),

  searchMedia: async (payload) => {
    const state = get();
    set({ loading: true, error: null });

    try {
      const searchData = {
        company_id: payload?.company_id ?? state.companyId,
        report_period: payload?.search_period ?? state.searchPeriod,
        search_type: 'materiality_assessment',
        timestamp: new Date().toISOString()
      };

      // Gateway API 호출
      const response = await axios.post(
        '/api/v1/materiality-service/search-media',
        searchData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        set({ 
          articles: response.data.data.articles,
          totalResults: response.data.data.total_results || 0,
          loading: false,
          error: null
        });
      } else {
        throw new Error(response.data.message || '미디어 검색 실패');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || '미디어 검색 요청 실패';
      set({ error: message, loading: false });
      throw err;
    }
  },

  reset: () => set({
    loading: false,
    error: null,
    articles: null,
    totalResults: 0
  })
}));
