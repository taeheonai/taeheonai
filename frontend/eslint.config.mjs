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
      // any 타입 완전 차단 (기본 규칙만)
      "@typescript-eslint/no-explicit-any": "error",
      
      // 추가 타입 안전성 규칙 (타입 정보 불필요)
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-returns": "error",
    },
  },
];

export default eslintConfig;
