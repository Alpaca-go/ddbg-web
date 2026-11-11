import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** 构建产物冒烟，独立端口确保不会误用开发服务器。 */
export default defineConfig({
  ...base,
  testMatch: ["home.spec.ts", "initial-threat.spec.ts", "content-packs.spec.ts"],
  workers: 1,
  use: { ...base.use, baseURL: "http://127.0.0.1:8081" },
  webServer: {
    command: "pnpm exec vite preview --port 8081 --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: false,
  },
});
