'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { AuthApiService, CompanyInfo } from '@/lib/authApi';

type User = { 
  id: string; 
  email?: string; 
  name: string;
  corporation_id: string;  // company_id → corporation_id로 변경
  companyname?: string;  // company_name → companyname으로 변경
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
  // 404 무한루프 방지를 위한 1회 시도 플래그
  hasTriedFetchCompany: boolean;
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
      hasTriedFetchCompany: false, // 404 무한루프 방지 플래그
      setUser: (u) => {
        set({ 
          user: u, 
          isAuthenticated: true,
          company: {
            isLoading: false,
            info: u.companyname ? {
              corporation_id: u.corporation_id,
              companyname: u.companyname
            } : undefined,
            error: undefined
          },
          hasTriedFetchCompany: false // 사용자 변경 시 플래그 리셋
        });
      },
      clear: () => set({ 
        user: null, 
        isAuthenticated: false,
        company: {
          isLoading: false,
          info: undefined,
          error: undefined,
        },
        hasTriedFetchCompany: false
      }),
      fetchCompanyInfo: async () => {
        const currentState = get();
        const user = currentState.user;
        
        // 🔴 404 무한루프 방지: 이미 시도했거나 로딩 중이면 즉시 리턴
        if (!user?.corporation_id || currentState.hasTriedFetchCompany || currentState.company.isLoading) {
          return;
        }

        // 🔴 1회 시도 플래그 설정
        set(state => ({
          hasTriedFetchCompany: true,
          company: {
            ...state.company,
            isLoading: true,
            error: undefined
          }
        }));

        try {
          const info = await AuthApiService.getCompanyInfo(user.corporation_id);
          set(state => ({
            company: {
              ...state.company,
              isLoading: false,
              info,
              error: undefined
            }
          }));
        } catch (e) {
          // 🔴 404든 뭐든 에러 발생 시 조용히 포기하고 더 이상 재시도하지 않음
          console.error('회사 정보 조회 실패 (1회 시도 후 포기):', e);
          set(state => ({
            company: {
              ...state.company,
              isLoading: false,
              info: undefined,
              error: undefined // 에러 메시지도 제거하여 재시도 트리거 방지
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