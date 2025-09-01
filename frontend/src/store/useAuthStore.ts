'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { AuthApiService, CompanyInfo } from '@/lib/authApi';

type User = { 
  id: string; 
  email?: string; 
  name: string;
  company_id: string;
  company_name?: string;
};

type CompanyState = {
  info?: CompanyInfo;
  isLoading: boolean;
  error?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  company: CompanyState;
  setUser: (u: User) => void;
  clear: () => void;
  fetchCompanyInfo: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      company: {
        isLoading: false,
        info: undefined,
        error: undefined,
      },
      setUser: (u) => {
        set({ 
          user: u, 
          isAuthenticated: true,
          company: {
            isLoading: false,
            info: u.company_name ? {
              id: u.company_id,
              name: u.company_name
            } : undefined,
            error: undefined
          }
        });
      },
      clear: () => set({ 
        user: null, 
        isAuthenticated: false,
        company: {
          isLoading: false,
          info: undefined,
          error: undefined,
        }
      }),
      fetchCompanyInfo: async () => {
        const user = get().user;
        if (!user?.company_id) return;

        set(state => ({
          company: {
            ...state.company,
            isLoading: true,
            error: undefined
          }
        }));

        try {
          const info = await AuthApiService.getCompanyInfo(user.company_id);
          set(state => ({
            company: {
              ...state.company,
              isLoading: false,
              info,
              error: undefined
            }
          }));
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : '회사 정보를 불러오지 못했습니다.';
          console.error('회사 정보 조회 실패:', errorMessage);
          set(state => ({
            company: {
              ...state.company,
              isLoading: false,
              error: errorMessage
            }
          }));
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        company: state.company
      }),
      version: 1,
    }
  )
);