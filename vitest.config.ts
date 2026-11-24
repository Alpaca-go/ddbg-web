import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // 与 apps/web/vite.config.ts 一致：@ddbg/engine 走源码路径而不是 workspace 链接。
    alias: {
      "@ddbg/engine": fileURLToPath(new URL("./packages/engine/src/index.ts", import.meta.url)),
    },
  },
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
