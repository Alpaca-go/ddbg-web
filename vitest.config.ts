import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 完整目录与严格回放会占用较多内存；默认命令沿用本轮全量验证的并发/预算。
    // 更长场景仍使用各自显式预算，CLI 可按机器资源覆盖并发。
    maxWorkers: 2,
    testTimeout: 30000,
    include: [
      "packages/engine/**/*.test.ts",
      "packages/data/**/*.test.ts",
      "apps/web/**/*.test.ts",
      "apps/web/**/*.test.tsx",
      "tools/pipeline/scripts/**/*.test.ts",
    ],
  },
});
