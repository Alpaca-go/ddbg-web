import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("Disinfection：三房清理／仅两房清理均按三棵消毒计 XP，保存刷新一致", async ({
  page,
}, testInfo) => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  const saves: { seed: number; save: unknown }[] = [];
  try {
    const load = (path: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
    const { taskSources } = await load("../src/dungeon-sandbox/task-sources.ts");
    const { disinfectionThreeTargets } = await load(
      "../../../packages/engine/src/test-helpers/disinfection-three-targets.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    for (const seed of [7, 2]) {
      const journey = disinfectionThreeTargets(seed, taskSources);
      saves.push({
        seed,
        save: createQuestSave(journey.start, journey.run.commands, journey.run.state, taskSources),
      });
    }
  } finally {
    await server.close();
  }
  await page.goto("/");
  for (const { seed, save } of saves) {
    await page.evaluate(async (data) => {
      const path = "/src/dungeon-sandbox/quest-save-storage.ts";
      const { writeLocalQuestSave } = await import(/* @vite-ignore */ path);
      await writeLocalQuestSave(JSON.stringify(data));
    }, save);
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    const summary = page.getByTestId("dungeon-quest-summary");
    await expect(summary).toContainText(`已消毒 3 棵橡树`);
    await expect(summary).toContainText(`每名英雄待发 3 XP`);
    await expect(summary).not.toContainText("巢穴清理");
    await page.getByRole("button", { name: "保存进度", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    await expect(summary).toContainText(`已消毒 3 棵橡树`);
    await expect(summary).toContainText(`每名英雄待发 3 XP`);
    await page.screenshot({ path: testInfo.outputPath(`oak-${seed}.png`), fullPage: true });
  }
});
