import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** 编译纯引擎性能探针，直接在 Node 运行，避免测试模块加载器的 getter 开销。 */
export default defineConfig({
  publicDir: false,
  build: {
    target: "node24",
    outDir: fileURLToPath(new URL("../../.cache/quest-save-profile", import.meta.url)),
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: fileURLToPath(
        new URL("../../tools/pipeline/scripts/quest-save-profile.ts", import.meta.url),
      ),
      formats: ["es"],
      fileName: () => "profile.mjs",
    },
    rolldownOptions: { external: ["node:perf_hooks"] },
  },
});
