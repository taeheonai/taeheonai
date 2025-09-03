import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // any 타입 경고로 완화 (기존 기능 보존을 위해)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // 사용되지 않는 변수 경고로 완화 (기존 기능 보존을 위해)
      "@typescript-eslint/no-unused-vars": "warn",
      
      // React 이스케이프 엔티티 경고로 완화
      "react/no-unescaped-entities": "warn",
      
      // React Hooks 의존성 배열 경고로 완화
      "react-hooks/exhaustive-deps": "warn",
      
      // prefer-const 경고로 완화
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
