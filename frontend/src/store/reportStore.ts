import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedAnswers {
  [griIndex: string]: {
    [questionId: string]: {
      answer_text: string;
      polished_text?: string;
      display_mode: 'table' | 'prose';
    };
  };
}

interface ReportState {
  gri: {
    savedAnswers: SavedAnswers;
  };
  companyname?: string;
  version: number;
}

interface ReportActions {
  setSavedAnswers: (answers: SavedAnswers) => void;
  updateAnswer: (griIndex: string, questionId: string, answer: {
    answer_text: string;
    polished_text?: string;
    display_mode: 'table' | 'prose';
  }) => void;
  clearAnswers: () => void;
  getAnswers: () => SavedAnswers;
  setCompanyName: (companyname: string) => void;
  getCompanyName: () => string | undefined;
}

type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      gri: {
        savedAnswers: {},
      },
      companyname: undefined,
      version: 1,

      setSavedAnswers: (answers) => {
        set((state) => ({
          ...state,
          gri: {
            ...state.gri,
            savedAnswers: answers,
          },
        }));
      },

      updateAnswer: (griIndex, questionId, answer) => {
        set((state) => ({
          ...state,
          gri: {
            ...state.gri,
            savedAnswers: {
              ...state.gri.savedAnswers,
              [griIndex]: {
                ...state.gri.savedAnswers[griIndex],
                [questionId]: answer,
              },
            },
          },
        }));
      },

      clearAnswers: () => {
        set((state) => ({
          ...state,
          gri: {
            ...state.gri,
            savedAnswers: {},
          },
        }));
      },

      getAnswers: () => {
        return get().gri.savedAnswers;
      },

      setCompanyName: (companyname: string) => {
        set((state) => ({
          ...state,
          companyname,
        }));
      },

      getCompanyName: () => {
        return get().companyname;
      },
    }),
    {
      name: 'report-storage',
      version: 1,
      partialize: (state) => ({
        gri: state.gri,
        companyname: state.companyname,
        version: state.version,
      }),
    }
  )
);
