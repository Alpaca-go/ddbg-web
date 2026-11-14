import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const test = ssrTest(import.meta.url);
test("Fungal Research：保留／全砸目标与带回 XP 分开展示，保存刷新一致", async ({
  page,
}, testInfo) => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  const saves: unknown[] = [];
  try {
    const load = (path: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
    const { taskSources } = await load("../src/dungeon-sandbox/task-sources.ts");
    const { fungalResearchJourney } = await load(
      "../../../packages/engine/src/test-helpers/fungal-research-quest.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    for (const strategy of ["retain-one", "destroy-all"]) {
      const journey = fungalResearchJourney(strategy, taskSources);
      saves.push(
        createQuestSave(journey.start, journey.run.commands, journey.run.state, taskSources),
      );
    }
  } finally {
    await server.close();
  }
  await page.goto("/");
  for (const [index, save] of saves.entries()) {
    await page.evaluate(async (data) => {
      const path = "/src/dungeon-sandbox/quest-save-storage.ts";
      const { writeLocalQuestSave } = await import(/* @vite-ignore */ path);
      await writeLocalQuestSave(JSON.stringify(data));
    }, save);
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    const summary = page.getByTestId("dungeon-quest-summary");
    await expect(summary).toContainText(`带回 ${index + 1} 个坏死真菌`);
    await expect(summary).toContainText(`任务目标${index === 0 ? "已取得" : "未取得"}`);
    await expect(summary).toContainText(`每名英雄待发 ${index + 1} XP`);
    await page.getByRole("button", { name: "保存进度", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "已保存" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
    await expect(summary).toContainText(`带回 ${index + 1} 个坏死真菌`);
    await expect(summary).toContainText(`任务目标${index === 0 ? "已取得" : "未取得"}`);
    await page.screenshot({ path: testInfo.outputPath(`fungal-${index}.png`), fullPage: true });
  }
});
