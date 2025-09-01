'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  sessionKey: string;
  threadId: string;
  ensureSession: () => void;
  resetSession: () => void;
  getSessionInfo: () => { sessionKey: string; threadId: string };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionKey: '',
      threadId: '',
      
      ensureSession: () => {
        set((state) => {
          // 이미 세션이 있으면 유지
          if (state.sessionKey && state.threadId) return state;
          
          // sessionStorage에서 복원 시도
          let sessionKey = sessionStorage.getItem('sessionKey');
          let threadId = sessionStorage.getItem('threadId');
          
          // sessionKey가 없으면 새로 생성
          if (!sessionKey) {
            sessionKey = crypto.randomUUID();
            sessionStorage.setItem('sessionKey', sessionKey);
          }
          
          // threadId가 없으면 새로 생성
          if (!threadId) {
            threadId = `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('threadId', threadId);
          }
          
          return { sessionKey, threadId };
        });
      },
      
      resetSession: () => {
        // 저장소에서 제거
        sessionStorage.removeItem('sessionKey');
        sessionStorage.removeItem('threadId');
        // 상태 초기화
        set({ sessionKey: '', threadId: '' });
      },
      
      getSessionInfo: () => {
        const state = get();
        return {
          sessionKey: state.sessionKey,
          threadId: state.threadId
        };
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionKey: state.sessionKey,
        threadId: state.threadId,
      }),
      version: 1,
    }
  )
);
