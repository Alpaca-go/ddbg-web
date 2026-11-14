import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("Circle of Witches：一／三目标 Crone 击杀与 XP 摘要保存刷新一致", async ({
  page,
}, testInfo) => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  const saves: { kills: number; save: unknown }[] = [];
  try {
    const load = (path: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
    const { taskSources } = await load("../src/dungeon-sandbox/task-sources.ts");
    const { circleOfWitchesJourney } = await load(
      "../../../packages/engine/src/test-helpers/circle-of-witches-quest.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    for (const kills of [1, 3]) {
      const journey = circleOfWitchesJourney(kills, taskSources);
      saves.push({
        kills,
        save: createQuestSave(journey.start, journey.run.commands, journey.run.state, taskSources),
      });
    }
  } finally {
    await server.close();
  }
  await page.goto("/");
  for (const { kills, save } of saves) {
    await page.evaluate(async (data) => {
      const path = "/src/dungeon-sandbox/quest-save-storage.ts";
      const { writeLocalQuestSave } = await import(/* @vite-ignore */ path);
      await writeLocalQuestSave(JSON.stringify(data));
    }, save);
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    const summary = page.getByTestId("dungeon-quest-summary");
    await expect(summary).toContainText(`击杀 Crone ${kills} 只`);
    await expect(summary).toContainText(`每名英雄待发 ${kills} XP`);
    await expect(summary).not.toContainText("巢穴清理");
    await page.getByRole("button", { name: "保存进度", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    await expect(summary).toContainText(`击杀 Crone ${kills} 只`);
    await expect(summary).toContainText(`每名英雄待发 ${kills} XP`);
    await page.screenshot({ path: testInfo.outputPath(`crone-${kills}.png`), fullPage: true });
  }
});
