import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("真实公开日志停点：点击消毒、保存刷新恢复，资源只扣一次", async ({ page }, testInfo) => {
  test.setTimeout(120000);
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
    const { disinfectionJourney } = await load(
      "../../../packages/engine/src/test-helpers/disinfection-quest.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    const journey = disinfectionJourney(taskSources);
    save = createQuestSave(
      journey.start,
      journey.before.commands,
      journey.before.game,
      taskSources,
    );
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
  await page.getByRole("tab", { name: "战利品", exact: true }).click();
  const button = page.getByRole("button", { name: "消毒橡树（1行动＋1药水）", exact: true });
  await expect(button).toBeEnabled();
  const read = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands } = useDungeonStore.getState();
      return {
        potions: game.battle.provisions.filter((p: { face: string }) => p.face === "potion").length,
        done: !!game.battle.infectedOakDisinfected,
        count: commands.filter((c: { type: string }) => c.type === "disinfectInfectedOak").length,
      };
    });
  const before = await read();
  await button.click();
  await expect(page.getByTestId("infected-oak-completed")).toBeVisible();
  const after = await read();
  expect(after).toEqual({ potions: before.potions - 1, done: true, count: before.count + 1 });
  await page.screenshot({ path: testInfo.outputPath("disinfected-oak.png"), fullPage: true });
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("infected-oak-completed")).toBeVisible();
  expect(await read()).toEqual(after);
});
