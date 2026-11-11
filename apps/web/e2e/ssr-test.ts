import { test as base } from "@playwright/test";

/**
 * 各 SSR 文件使用独立 worker 身份，避免多个 Vite ModuleRunner 的大目录在长驻进程累积。
 * 同一文件内仍共享 beforeAll 夹具；文件结束后由 Playwright 回收整个 worker。
 */
export function ssrTest(fileUrl: string) {
  return base.extend<object, { ssrSpecFile: string }>({
    ssrSpecFile: [fileUrl, { scope: "worker", option: true }],
  });
}
