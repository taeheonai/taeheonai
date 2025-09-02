'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GRIItem } from '@/types/gri';

type GriUIState = {
  sessionKey: string | null;
  selectedItem: GRIItem | null;
  setSessionKey: (k: string) => void;
  setSelectedItem: (item: GRIItem | null) => void;
  reset: () => void;
};

export const useGriUIStore = create<GriUIState>()(
  persist(
    (set) => ({
      sessionKey: null,
      selectedItem: null,

      setSessionKey: (k) => set({ sessionKey: k }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      reset: () => set({ sessionKey: null, selectedItem: null }),
    }),
    {
      name: 'gri-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionKey: state.sessionKey,
        selectedItem: state.selectedItem,
      }),
    }
  )
);
