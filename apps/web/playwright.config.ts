import { defineConfig, devices } from "@playwright/test";

const port = 8080;
/** 本机浏览器版本不匹配时，用这个环境变量指向已有的 Chromium（只影响本地调试，CI 不设置）。 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Windows + Vite dev server 下，并行会让长用例在 page.goto 处偶发超时；本地串行更稳。
  workers: process.env.CI ? 2 : 1,
  // 每条用例独立预算；长场景（侦察/战斗/存档）本来就要 1–2 分钟。
  timeout: 120_000,
  // 偶发的导航/加载抖动重试一次；真失败仍会报出来。
  retries: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: `pnpm exec vite --port ${port} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
