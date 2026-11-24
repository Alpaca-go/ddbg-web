import { expect } from "@playwright/test";
import { ssrTest } from "../core/ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
for (const quest of ["fungal", "patrol"] as const)
  test(`I 级收尾：当前版本 ${quest} 目标与 XP 保存刷新恢复`, async ({ page }) => {
    test.setTimeout(180000);
    const server = await createServer({
      configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
      configLoader: "runner",
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true },
    });
    let save: unknown;
    try {
      const load = (path: string) =>
        server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
      const { taskSources } = await load("../../src/dungeon-sandbox/task-sources.ts");
      const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
      const journey =
        quest === "fungal"
          ? (
              await load(
                "../../../packages/engine/src/test-helpers/fungal-research-three-objectives.ts",
              )
            ).fungalResearchThreeObjectives(taskSources, true, "retain-all")
          : (
              await load("../../../packages/engine/src/test-helpers/patrol-the-woods-quest.ts")
            ).patrolTheWoodsJourney(taskSources, true);
      expect(journey.run.stopReason).toBeNull();
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
    const assertSummary = async () => {
      await expect(summary).toContainText(`每名英雄待发 ${quest === "fungal" ? 0 : 3} XP`);
      if (quest === "fungal") {
        await expect(summary).toContainText("带回 0 个坏死真菌");
        await expect(summary).toContainText("任务目标已取得");
      } else await expect(summary).toContainText("已清理 6 间房");
    };
    await assertSummary();
    const read = () =>
      page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const { game, commands } = useDungeonStore.getState();
        return { game, commands };
      });
    const before = await read();
    expect(
      before.commands.filter((c: { type: string }) => c.type === "startBattle").length,
    ).toBeGreaterThan(0);
    expect(
      before.commands
        .filter((c: { type: string }) => c.type === "startBattle")
        .every(
          (c: { wealdOurs?: boolean; wealdClearingMonsters?: boolean }) =>
            c.wealdOurs && c.wealdClearingMonsters,
        ),
    ).toBe(true);
    await page.getByRole("button", { name: "保存进度", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    await assertSummary();
    expect(await read()).toEqual(before);
  });
