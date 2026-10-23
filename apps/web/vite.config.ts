import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { battleDataPlugin } from "./battle-data-plugin";
import { cardArtCachePlugin } from "./card-art-cache-plugin";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** 本地开发 / preview 默认端口（根目录 `pnpm dev` 或 `npm run dev`）。 */
export const DEV_SERVER_PORT = 8080;

export default defineConfig({
  plugins: [battleDataPlugin(), cardArtCachePlugin(repoRoot), react(), tailwindcss()],
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
  },
  preview: {
    port: DEV_SERVER_PORT,
    strictPort: true,
  },
});
