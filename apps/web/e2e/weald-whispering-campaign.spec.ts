import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
test("受控III级村庄页面抽选p015；真实起点版本文件导入和刷新恢复", async ({ page }) => {
  test.setTimeout(180000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let checkpoint: GameState, save: unknown;
  try {
    const { wealdHigherHamletFixture } = await server.ssrLoadModule(
      fileURLToPath(
        new URL(
          "../../../packages/engine/src/test-helpers/weald-higher-hamlet.ts",
          import.meta.url,
        ),
      ),
    );
    checkpoint = wealdHigherHamletFixture();
    const { createCampaignQuest } = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/engine/src/campaign-entry.ts", import.meta.url)),
    );
    const { createQuestSave } = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/engine/src/quest-save.ts", import.meta.url)),
    );
    const { coreParty } = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/core-quest.ts", import.meta.url),
      ),
    );
    const { taskSources } = await server.ssrLoadModule(
      fileURLToPath(new URL("../src/dungeon-sandbox/task-sources.ts", import.meta.url)),
    );
    const game = createCampaignQuest(
      0,
      "quest:p001",
      "radiant",
      coreParty,
      taskSources,
      ["core", "weald"],
      undefined,
      true,
    );
    save = createQuestSave(
      {
        seed: 0,
        questId: "quest:p001",
        mode: "radiant",
        party: coreParty,
        contentPacks: ["core", "weald"],
        bossEdgeRooms: true,
        stygianRoomRules: "full",
        wealdHigherQuestOffers: true,
      },
      [],
      game,
      taskSources,
    );
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.getByTestId("content-pack-weald").check();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "抽取首趟任务", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  expect(
    await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      return useDungeonStore.getState().game.dungeon.wealdHigherQuestOffers;
    }),
  ).toBe(true);
  await page.evaluate(async (game) => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, checkpoint);
  const current = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      return useDungeonStore.getState().game;
    });
  await page.getByRole("button", { name: /抽取下一任务/ }).click();
  await page
    .getByRole("button", { name: "遗迹与 Weald：两地任务堆各抽 1 张", exact: true })
    .click();
  await page.getByRole("button", { name: "Whispering Woods", exact: true }).click();
  expect((await current()).dungeon).toMatchObject({
    whisperingWoodsQuest: true,
    wealdHigherQuestOffers: true,
    phase: "awaitingProvisions",
  });
  const input = {
    name: "higher-version.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(save)),
  };
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input);
  await expect
    .poll(async () => (await current()).dungeon?.questDistribution?.questId)
    .toBe("quest:p001");
  expect((await current()).dungeon.wealdHigherQuestOffers).toBe(true);
  const imported = await current();
  await page.reload();
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input);
  await expect.poll(async () => (await current()).dungeon?.wealdHigherQuestOffers).toBe(true);
  expect(await current()).toEqual(imported);
  expect((await current()).dungeon.wealdHigherQuestOffers).toBe(true);
});
