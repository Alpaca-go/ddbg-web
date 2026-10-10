import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { battleDataPlugin } from "./battle-data-plugin";

export default defineConfig({
  plugins: [battleDataPlugin(), react(), tailwindcss()],
});
