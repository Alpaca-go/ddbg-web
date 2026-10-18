import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { battleDataPlugin } from "./battle-data-plugin";
import { cardArtCachePlugin } from "./card-art-cache-plugin";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export default defineConfig({
  plugins: [battleDataPlugin(), cardArtCachePlugin(repoRoot), react(), tailwindcss()],
});
