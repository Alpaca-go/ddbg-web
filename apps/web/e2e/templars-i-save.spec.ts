import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("自然 Templars I 任务存档：页面读取、开战、保存刷新后继续", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let save: unknown;
  try {
    const load = (relative: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(relative, import.meta.url)));
    const { taskSources } = await load("../src/dungeon-sandbox/task-sources.ts");
    const { naturalQuest, naturalParty } = await load(
      "../../../packages/engine/src/test-helpers/natural-quest.ts",
    );
    const { createQuestSave } = await load("../../../packages/engine/src/quest-save.ts");
    let deployed: unknown;
    let count = 0,
      prefix = 0;
    const run = naturalQuest(5075, "quest:p017", false, taskSources, 2, {
      observe(state: unknown, command: { type: string }) {
        count++;
        if (command.type === "deployTemplarsI") {
          deployed = state;
          prefix = count;
        }
      },
    });
    expect(run.state.dungeon.bossQuestVictory).toBe(true);
    expect(deployed).toBeDefined();
    save = createQuestSave(
      {
        seed: 5075,
        questId: "quest:p017",
        mode: "radiant",
        party: naturalParty,
        bossEdgeRooms: true,
      },
      run.commands.slice(0, prefix),
      deployed,
      taskSources,
    );
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.evaluate(async (save) => {
    const path = "/src/dungeon-sandbox/quest-save-storage.ts";
    const { writeLocalQuestSave } = await import(/* @vite-ignore */ path);
    await writeLocalQuestSave(JSON.stringify(save));
  }, save);
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return {
      turn: game.battle.encounter.turn.type,
      deckSize: game.battle.encounter.deck.length,
      last: commands.at(-1).type,
      refused: events.filter((e: { type: string }) => e.type === "commandRefused"),
    };
  });
  expect(result).toEqual({
    turn: "awaitingInitiative",
    deckSize: 8,
    last: "startBattle",
    refused: [],
  });
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByText("已保存到本机，可刷新后读取继续。", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
