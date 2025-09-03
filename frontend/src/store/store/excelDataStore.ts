'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage, type PersistOptions } from 'zustand/middleware';

// 저장용 조각 타입(실제로 localStorage에 남길 필드만)
type ExcelPersist = Pick<ExcelDataState, 
  'excelData' | 'isValid' | 'fileName' | 'base64Data' | 
  'surveyUploadData' | 'surveyUploadFileName' | 'surveyUploadBase64' | 'surveyUploadIsValid'
>;

// SSR 안전 스토리지
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// ── 타입 정의 ─────────────────────────────────────────────
export interface ExcelRow {
  name: string;
  position: string;
  company: string;
  stakeholderType: string;
  email: string;
}

export interface ExcelDataState {
  // 기본 엑셀
  excelData: ExcelRow[];
  isValid: boolean;
  fileName?: string;
  base64Data?: string;

  // 설문 업로드
  surveyUploadData: ExcelRow[];
  surveyUploadFileName?: string;
  surveyUploadBase64?: string;
  surveyUploadIsValid: boolean;
}

export interface ExcelDataActions {
  // 기본 메서드들
  setExcelData: (rows: ExcelRow[]) => void;
  setFileName: (name?: string) => void;
  setBase64Data: (b64?: string) => void;
  updateRow: (index: number, updatedData: ExcelRow) => void;
  deleteRow: (index: number) => void;
  clearExcel: () => void;

  setSurveyUploadData: (rows: ExcelRow[]) => void;
  setSurveyUploadFileName: (name?: string) => void;
  setSurveyUploadBase64: (b64?: string) => void;
  updateSurveyUploadRow: (index: number, updatedData: ExcelRow) => void;
  deleteSurveyUploadRow: (index: number) => void;
  clearSurveyUpload: () => void;

  // 호환용/별칭 추가
  setIsValid: (v: boolean) => void;
  setExcelFilename: (name: string | null) => void;
  setExcelBase64: (b64: string | null) => void;
  setSurveyUploadsValid: (v: boolean) => void;
  reset: () => void;
  saveToLocalStorage: () => void;
  loadFromStorage: () => Promise<void>;
  loadUploadedExcelData: (rows: ExcelRow[]) => void;
  loadSurveyUploadData: () => void;
}

export type ExcelDataStore = ExcelDataState & ExcelDataActions;

const initialState: ExcelDataState = {
  excelData: [],
  isValid: false,
  fileName: undefined,
  base64Data: undefined,
  surveyUploadData: [],
  surveyUploadFileName: undefined,
  surveyUploadBase64: undefined,
  surveyUploadIsValid: false,
};

// ── 스토어 ───────────────────────────────────────────────
export const useExcelDataStore = create<ExcelDataStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 기본 메서드들
      setExcelData: (rows) =>
        set({ excelData: rows, isValid: rows.length > 0 }),
      setFileName: (name) => set({ fileName: name }),
      setBase64Data: (b64) => set({ base64Data: b64 }),
      updateRow: (index, updatedData) => {
        const currentData = [...get().excelData];
        currentData[index] = updatedData;
        set({ excelData: currentData, isValid: currentData.length > 0 });
      },
      deleteRow: (index) => {
        const currentData = [...get().excelData];
        currentData.splice(index, 1);
        set({ excelData: currentData, isValid: currentData.length > 0 });
      },
      clearExcel: () =>
        set({
          excelData: [],
          isValid: false,
          fileName: undefined,
          base64Data: undefined,
        }),

      setSurveyUploadData: (rows) =>
        set({
          surveyUploadData: rows,
          surveyUploadIsValid: rows.length > 0,
        }),
      setSurveyUploadFileName: (name) =>
        set({ surveyUploadFileName: name }),
      setSurveyUploadBase64: (b64) =>
        set({ surveyUploadBase64: b64 }),
      updateSurveyUploadRow: (index, updatedData) => {
        const currentData = [...get().surveyUploadData];
        currentData[index] = updatedData;
        set({ 
          surveyUploadData: currentData,
          surveyUploadIsValid: currentData.length > 0
        });
      },
      deleteSurveyUploadRow: (index) => {
        const currentData = [...get().surveyUploadData];
        currentData.splice(index, 1);
        set({ 
          surveyUploadData: currentData,
          surveyUploadIsValid: currentData.length > 0
        });
      },
      clearSurveyUpload: () =>
        set({
          surveyUploadData: [],
          surveyUploadIsValid: false,
          surveyUploadFileName: undefined,
          surveyUploadBase64: undefined,
        }),

      // 호환용/별칭
      setIsValid: (v) => set({ isValid: v }),
      setExcelFilename: (name) => set({ fileName: name ?? undefined }),
      setExcelBase64: (b64) => set({ base64Data: b64 ?? undefined }),
      setSurveyUploadsValid: (v) => set({ surveyUploadIsValid: !!v }),
      reset: () => set({ ...initialState }),
      saveToLocalStorage: () => { /* persist가 처리하므로 noop */ },
      loadFromStorage: async () => {
        type PersistHelpers = { persist?: { rehydrate?: () => Promise<void> } };
        const helpers = (useExcelDataStore as unknown as PersistHelpers).persist;
        if (helpers?.rehydrate) {
          await helpers.rehydrate();
        }
      },
      loadUploadedExcelData: (rows) => {
        set({ excelData: rows, isValid: rows.length > 0 });
      },
      loadSurveyUploadData: () => {
        const cur = get().surveyUploadData;
        set({ surveyUploadData: cur, surveyUploadIsValid: cur.length > 0 });
      },
    }),
    {
      name: 'excel-data-v1',
      storage: createJSONStorage<ExcelPersist>(() =>
        typeof window !== 'undefined' ? window.localStorage : noopStorage
      ),
      partialize: (s): ExcelPersist => ({
        excelData: s.excelData,
        isValid: s.isValid,
        fileName: s.fileName,
        base64Data: s.base64Data,
        surveyUploadData: s.surveyUploadData,
        surveyUploadFileName: s.surveyUploadFileName,
        surveyUploadBase64: s.surveyUploadBase64,
        surveyUploadIsValid: s.surveyUploadIsValid,
      }),
      version: 1,
    }
  )
);