export const SURVEY_KEY_STORAGE = 'surveyKey';

export function normalizeSurveyKey(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/\./g, '_');
}

export function saveSurveyKey(rawKey: string): string {
  if (typeof window === 'undefined') return rawKey;

  const key = normalizeSurveyKey(rawKey);
  try {
    localStorage.setItem(SURVEY_KEY_STORAGE, key);
    console.info('설문 ID localStorage 저장 완료(정규화):', key);
  } catch (error) {
    console.warn('설문 ID 저장 실패:', error);
  }
  return key;
}

export function loadSurveyKey(): string {
  if (typeof window === 'undefined') return '';

  try {
    return normalizeSurveyKey(localStorage.getItem(SURVEY_KEY_STORAGE));
  } catch (error) {
    console.warn('설문 ID 로드 실패:', error);
    return '';
  }
}

export function generateSurveyKey(corpId: string | number, surveyId: string | number): string {
  return `${corpId}_${surveyId}`;
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}
