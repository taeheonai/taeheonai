import { create } from 'zustand';

interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// Store exports
export { useAuthStore } from './useAuthStore';
export { useGriStore } from './useGriStore';
export { useMGStore } from './mgStore';
export { usePolishStore } from './polishStore';
export { useSessionStore } from './sessionStore';
export { useHasHydrated } from './useHasHydrated'; 