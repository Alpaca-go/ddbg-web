import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { ssrTest } from "../core/ssr-test";

const test = ssrTest(import.meta.url);
test("Pounder真实日志文件：导入、导出、篡改拒绝及刷新恢复", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let payload: string;
  try {
    const { taskSources } = await server.ssrLoadModule(
      fileURLToPath(new URL("../../src/dungeon-sandbox/task-sources.ts", import.meta.url)),
    );
    const { pounderUiFixture } = await server.ssrLoadModule(
      fileURLToPath(new URL("../fixtures/pounder-i.ts", import.meta.url)),
    );
    payload = JSON.stringify(pounderUiFixture(taskSources).save);
  } finally {
    await server.close();
  }
  const input = (buffer: Buffer) => ({
    name: "pounder-player-log.json",
    mimeType: "application/json",
    buffer,
  });
  await page.goto("/");
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input(Buffer.from(payload)));
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByText("Pounder 行动", { exact: true })).toBeVisible();
  const localBefore = await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"));
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出存档文件", exact: true }).click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!);
  const json = JSON.parse(exported.toString("utf8"));
  expect(json.commands.some((c: { type: string }) => c.type === "deployPounderI")).toBe(true);
  expect(json.snapshot.dungeon.pounderBossBattles).toBe(true);
  const tampered = structuredClone(json);
  delete tampered.snapshot.dungeon.pounderBossBattles;
  await page
    .getByLabel("导入存档文件", { exact: true })
    .setInputFiles(input(Buffer.from(JSON.stringify(tampered))));
  // 篡改拒绝还会核对可信旧目录；完整长日志不使用默认5秒断言预算。
  await expect(page.getByRole("status").filter({ hasText: "回放不一致" })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Pounder 行动", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
  await page.reload();
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input(exported));
  await expect(page.getByText("Pounder 行动", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1"))).toBe(
    localBefore,
  );
});
