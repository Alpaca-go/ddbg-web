import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("Purge the Woods：三巢穴当地牌池与 3 XP 保存刷新一致", async ({ page }, testInfo) => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let save: unknown;
  try {
    const load = (path: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
    const { taskSources } = await load("../src/dungeon-sandbox/task-sources.ts");
    const { purgeTheWoodsJourney } = await load(
      "../../../packages/engine/src/test-helpers/purge-the-woods-quest.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    const journey = purgeTheWoodsJourney(taskSources);
    save = createQuestSave(journey.start, journey.run.commands, journey.run.state, taskSources);
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.evaluate(async (data) => {
    const path = "/src/dungeon-sandbox/quest-save-storage.ts";
    const { writeLocalQuestSave } = await import(/* @vite-ignore */ path);
    await writeLocalQuestSave(JSON.stringify(data));
  }, save);
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  const summary = page.getByTestId("dungeon-quest-summary");
  await expect(summary).toContainText("巢穴清理 3 / 3 间");
  await expect(summary).toContainText("Purge the Woods");
  await expect(summary).toContainText("每名英雄待发 3 XP");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(summary).toContainText("巢穴清理 3 / 3 间");
  await expect(summary).toContainText("每名英雄待发 3 XP");
  const pool = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    return useDungeonStore.getState().game.dungeon.monsterPool;
  });
  expect(pool.monsterDrawScope).toBe("wealdLocalOnly");
  await page.screenshot({
    path: testInfo.outputPath("purge-three-lairs.png"),
    fullPage: true,
  });
});
