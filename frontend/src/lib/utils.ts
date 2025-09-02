/**
 * 안전한 trim 함수 - 문자열이 아닌 값에 대해서도 안전하게 동작
 * @param v - trim할 값
 * @returns trim된 문자열 또는 빈 문자열
 */
export function safeTrim(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  // 숫자/불리언도 문자열화 후 트림
  return String(v).trim();
}

/**
 * 안전한 문자열 변환 함수
 * @param v - 변환할 값
 * @returns 문자열 또는 빈 문자열
 */
export function safeString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

/**
 * 안전한 숫자 변환 함수
 * @param v - 변환할 값
 * @param defaultValue - 기본값
 * @returns 숫자 또는 기본값
 */
export function safeNumber(v: unknown, defaultValue: number = 0): number {
  if (typeof v === 'number') return v;
  if (v == null) return defaultValue;
  const parsed = Number(v);
  return isNaN(parsed) ? defaultValue : parsed;
}
