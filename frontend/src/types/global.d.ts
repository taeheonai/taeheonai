// src/types/global.d.ts
declare global {
  interface Window {
    axios: typeof import("axios").default;
  }
}
export {};
