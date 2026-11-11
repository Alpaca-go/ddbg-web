import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { QuestSave } from "../../../packages/data/src/quest-save";
import type { Command, GameState } from "../../../packages/engine/src/command";
import { decodeLocalQuestSave } from "../src/dungeon-sandbox/quest-save-storage";

const test = ssrTest(import.meta.url);

test("重生池：真实战斗存档返回清场→复活→免费补位入队→刷新回放", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let save: QuestSave;
  try {
    const module = (path: string) =>
      server.ssrLoadModule(fileURLToPath(new URL(path, import.meta.url)));
    const plugin = await module("../battle-data-plugin.ts");
    const code = plugin.battleDataPlugin().load("\0virtual:quest-battle-data");
    const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
    catalog.monsters = [...catalog.monsters, ...(catalog.bossMonsters ?? [])];
    delete catalog.bossMonsters;
    const core = await module("../../../packages/engine/src/test-helpers/core-quest.ts");
    const natural = await module("../../../packages/engine/src/test-helpers/natural-quest.ts");
    const engine = await module("../../../packages/engine/src/command.ts");
    const entry = await module("../../../packages/engine/src/dungeon-quest-entry.ts");
    const saves = await module("../../../packages/engine/src/quest-save.ts");
    const sources = {
      ...core.coreQuestSources,
      catalog: { ...catalog, trinkets: core.coreQuestSources.catalog.trinkets },
    };
    const start = {
      seed: 916,
      questId: "quest:p016",
      mode: "radiant",
      party: natural.naturalParty,
    };
    const prefix = natural.naturalQuest(916, "quest:p016", true, sources, 2, {
      observe(state: GameState) {
        if (state.dungeon?.pending?.id.startsWith("pool-rebirth:")) throw Error("pool-checkpoint");
      },
    });
    expect(prefix.stopReason).toBe("pool-checkpoint");
    expect(prefix.commands.at(-1).type).toBe("finishDungeonBattle");
    const commands: Command[] = prefix.commands.slice(0, -1);
    let game = entry.createCoreDungeonQuest(916, "quest:p016", "radiant", start.party, sources);
    for (const command of commands) {
      const next = engine.applyCommand(game, command);
      expect(next.events.some((e: { type: string }) => e.type === "commandRefused")).toBe(false);
      game = next.state;
    }
    save = saves.createQuestSave(start, commands, game, sources);
  } finally {
    await server.close();
  }

  await page.goto("/");
  await page.evaluate(async (payload) => {
    const path = "/src/dungeon-sandbox/quest-save-storage.ts";
    const storage = await import(/* @vite-ignore */ path);
    await storage.writeLocalQuestSave(payload);
  }, JSON.stringify(save));
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByTestId("area-F")).toBeVisible();
  await page.getByRole("button", { name: "返回地牢地图", exact: true }).click();
  const choice = page.getByTestId("dungeon-pending-choice");
  await expect(choice).toContainText("本次清场仅一次机会");
  await choice.getByRole("button", { name: /^复活 CRUSADER/ }).click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存到本机" })).toBeVisible();
  const revived = JSON.parse(
    await decodeLocalQuestSave(
      await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1")!),
    ),
  );
  expect(revived.snapshot.dungeon.stagecoachHeroes).toHaveLength(1);
  expect(revived.snapshot.dungeon.poolRebirthRooms[0].status).toBe("used");
  const tokens = revived.snapshot.dungeon.waitingHeroTokens;
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await page.getByRole("button", { name: "准备驿站替补", exact: true }).click();
  await choice.getByRole("button", { name: /让复活的 CRUSADER 补位/ }).click();
  await page.getByRole("button", { name: "让1名替补入队并继续", exact: true }).click();
  await expect(choice).toContainText("抽卡前决定是否使用 Torch");
  await choice
    .getByRole("button", { name: /先使用火把/ })
    .first()
    .click();
  await choice.getByRole("button", { name: "hero-3", exact: true }).click();
  await page.getByRole("button", { name: "结算当前 Curio", exact: true }).click();
  for (let i = 0; i < 20 && (await choice.count()); i++)
    await choice.getByRole("button").first().click();
  await page.getByRole("button", { name: "保存进度", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已保存到本机" })).toBeVisible();
  const joined = JSON.parse(
    await decodeLocalQuestSave(
      await page.evaluate(() => localStorage.getItem("ddbg.core-quest.save.v1")!),
    ),
  );
  expect(joined.snapshot.dungeon.heroes).toHaveLength(4);
  expect(joined.snapshot.dungeon.heroes.every((h: { dead: boolean }) => !h.dead)).toBe(true);
  expect(joined.snapshot.dungeon.stagecoachHeroes).toEqual([]);
  expect(joined.snapshot.dungeon.waitingHeroTokens).toBe(tokens);
  await page.reload();
  await page.getByRole("button", { name: "读取本机存档", exact: true }).click();
  await expect(page.getByRole("button", { name: "准备驿站替补", exact: true })).toHaveCount(0);
  await expect(choice).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("pool-rebirth-complete.png"), fullPage: true });
});
