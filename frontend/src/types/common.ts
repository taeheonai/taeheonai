// any 대신 사용할 안전한 타입들

// 1. 제네릭 타입
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

// 2. 유니온 타입
export type Status = 'loading' | 'success' | 'error' | 'idle';

// 3. 인덱스 시그니처 (동적 객체)
export type DynamicObject = {
  [key: string]: string | number | boolean | null | undefined;
};

// 4. 조건부 타입
export type ConditionalType<T> = T extends string ? 'string' : T extends number ? 'number' : 'unknown';

// 5. 매핑된 타입
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 6. 유틸리티 타입
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 7. 에러 타입
export type ApiError = {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
};

// 8. 이벤트 핸들러 타입
export type EventHandler<T = Event> = (event: T) => void;

// 9. 비동기 함수 타입
export type AsyncFunction<T = unknown, R = unknown> = (arg: T) => Promise<R>;

// 10. 옵셔널 체이닝을 위한 타입
export type Optional<T> = T | null | undefined;

// 11. 배열 타입
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// 12. 함수 타입
export type FunctionType<TArgs extends unknown[] = unknown[], TReturn = unknown> = (...args: TArgs) => TReturn;
