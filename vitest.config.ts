import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/engine/**/*.test.ts",
      "packages/data/**/*.test.ts",
      "apps/web/**/*.test.ts",
      "tools/pipeline/scripts/**/*.test.ts",
    ],
  },
});
