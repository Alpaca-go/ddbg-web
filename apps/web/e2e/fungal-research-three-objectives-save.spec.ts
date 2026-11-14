import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("Fungal Research：三目标取得、带回 4 封顶 3 XP，保存刷新一致", async ({ page }, testInfo) => {
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
    const { fungalResearchThreeObjectives } = await load(
      "../../../packages/engine/src/test-helpers/fungal-research-three-objectives.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    const journey = fungalResearchThreeObjectives(taskSources);
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
  await expect(summary).toContainText("带回 4 个坏死真菌");
  await expect(summary).toContainText("任务目标已取得");
  await expect(summary).toContainText("每名英雄待发 3 XP");
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(summary).toContainText("带回 4 个坏死真菌");
  await expect(summary).toContainText("每名英雄待发 3 XP");
  const secured = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    return useDungeonStore.getState().game.dungeon.fungalResearchSecuredRoomCardIds;
  });
  expect([...secured].sort()).toEqual(["room:weald:p003", "room:weald:p006", "room:weald:p008"]);
  await page.screenshot({
    path: testInfo.outputPath("fungal-three-objectives.png"),
    fullPage: true,
  });
});
