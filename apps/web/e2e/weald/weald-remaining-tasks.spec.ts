import { expect } from "@playwright/test";
import { ssrTest } from "../core/ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../../packages/engine/src/shared/core/command";
const test = ssrTest(import.meta.url);
test("剩余任务页面：点火与等待轮末；双补给宝箱Wild选择", async ({ page }) => {
  test.setTimeout(180000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let oak: GameState, supplies: GameState, waiting: GameState;
  try {
    const load = (p: string) => server.ssrLoadModule(fileURLToPath(new URL(p, import.meta.url)));
    const { wealdOakBattleFixture } = await load(
      "../../../packages/engine/src/test-helpers/weald-oak-battle.ts",
    );
    const { wealdSuppliesLootFixture } = await load(
      "../../../packages/engine/src/test-helpers/weald-task-battle.ts",
    );
    const { applyCommand } = await load("../../../packages/engine/src/command.ts");
    const { removeCasualties } = await load("../../../packages/engine/src/encounter.ts");
    oak = wealdOakBattleFixture();
    supplies = wealdSuppliesLootFixture();
    let game = applyCommand(oak, {
      type: "igniteWealdOak",
      actorId: oak.battle!.entities[0]!.id,
    }).state;
    const wipe = () => {
      const ids = game.battle.entities
        .filter((e: { side: string }) => e.side === "monster")
        .map((e: { id: string }) => e.id);
      game = removeCasualties(
        {
          state: {
            ...game,
            battle: {
              ...game.battle,
              entities: game.battle.entities.map((e: { id: string; life: number }) =>
                ids.includes(e.id) ? { ...e, dead: true, wounds: e.life } : e,
              ),
            },
          },
          events: [],
        },
        ids,
      ).state;
      game = {
        ...game,
        battle: {
          ...game.battle,
          encounter: { ...game.battle.encounter, deck: [], turn: { type: "awaitingInitiative" } },
        },
      };
    };
    wipe();
    let r = applyCommand(game, { type: "drawInitiative" });
    for (let i = 0; r.pendingChoice && i < 20; i++) {
      const p = r.pendingChoice;
      r = applyCommand(r.state, {
        type: "resolveChoice",
        choiceId: p.id,
        optionId: p.options[0].id,
      });
    }
    game = r.state;
    wipe();
    waiting = game;
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.getByTestId("content-pack-weald").check();
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "抽取首趟任务", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  const install = (game: GameState) =>
    page.evaluate(async (game) => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
    }, game);
  const current = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const game = useDungeonStore.getState().game,
        b = game.battle;
      return {
        inventoryOverflowHold: game.inventoryOverflowHold,
        battle: {
          pending: b.pending,
          provisions: b.provisions,
          encounter: b.encounter,
          loot: b.loot,
          wealdOakIgnitedRound: b.wealdOakIgnitedRound,
          wealdOakBurnt: b.wealdOakBurnt,
        },
      };
    });
  await install(oak!);
  await page.getByRole("tab", { name: "战利品", exact: true }).click();
  await page.getByRole("button", { name: "点燃橡树（1行动＋1火把）", exact: true }).click();
  await expect.poll(async () => (await current()).battle.wealdOakIgnitedRound).toBe(1);
  await expect(page.getByText("橡树燃烧中，等待第2轮结束。", { exact: true })).toBeVisible();
  expect((await current()).battle.provisions).toEqual([]);
  await install(waiting!);
  await page.getByRole("button", { name: "抽取先攻", exact: true }).click();
  await expect.poll(async () => (await current()).battle.wealdOakBurnt).toBe(true);
  expect((await current()).battle.encounter.turn).toMatchObject({
    type: "finished",
    outcome: "victory",
  });
  for (const count of [15, 16]) {
    const fixture: GameState = {
      ...supplies!,
      battle: {
        ...supplies!.battle!,
        provisions: Array.from({ length: count }, (_, i) => ({
          id: `existing:${i}`,
          face: "food",
        })),
      },
    };
    await install(fixture);
    await page.getByRole("tab", { name: "战利品", exact: true }).click();
    await page.getByRole("button", { name: "拾取同区宝箱", exact: true }).click();
    await expect.poll(async () => (await current()).battle.pending?.type).toBe("lootReward");
    for (let i = 0; i < 2 && (await current()).battle.pending?.type === "lootReward"; i++)
      await page.getByRole("button", { name: "火把", exact: true }).click();
    expect((await current()).battle.provisions).toHaveLength(count + 2);
    expect((await current()).battle.encounter.turn).toMatchObject({ type: "hero", actions: 1 });
    for (let i = 0; i < count - 14; i++) {
      const p = (await current()).battle.pending.choice;
      const option =
        i === 0
          ? p.options.find((o: { id: string }) => o.id.startsWith("loot-provision:"))
          : p.options[0];
      await page.getByRole("button", { name: option.label, exact: true }).click();
    }
    expect((await current()).battle.provisions).toHaveLength(16);
    expect((await current()).inventoryOverflowHold).toBeUndefined();
    expect((await current()).battle.encounter.turn).toMatchObject({ type: "hero", actions: 1 });
    expect((await current()).battle.loot.gold).toBe(0);
  }
});
