import { defineConfig, devices } from "@playwright/test";

const port = 8080;
/** 本机浏览器版本不匹配时，用这个环境变量指向已有的 Chromium（只影响本地调试，CI 不设置）。 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
