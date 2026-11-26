import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.cache/**",
      "**/dist/**",
      "**/deploy/**",
      "**/node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["tools/pipeline/scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react-dom/*"],
              message: "规则引擎不能依赖 React 或 DOM",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[computed=false][property.name=iconId], MemberExpression[computed=true][property.value=iconId], ObjectPattern > Property[key.name=iconId], ObjectPattern > Property[key.value=iconId]",
          message: "图标指纹由数据层校验。引擎使用已核准的 rules 或数据层校验函数。",
        },
        {
          selector: String.raw`Literal[value=/\b[0-9a-f]{10}\b/], TemplateElement[value.raw=/\b[0-9a-f]{10}\b/]`,
          message: "10 位十六进制印刷指纹请登记在对应内容的数据层。",
        },
      ],
    },
  },
  prettier,
);
