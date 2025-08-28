'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = { 
  id: string; 
  email?: string; 
  name: string;
  company_id: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (u: User) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (u) => set({ user: u, isAuthenticated: true }),
      clear: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      version: 1,
    }
  )
);