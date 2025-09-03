module.exports = {
  root: true,
  extends: ["next", "next/core-web-vitals"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
};