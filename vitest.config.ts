import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/engine/**/*.test.ts", "packages/data/**/*.test.ts"],
  },
});
