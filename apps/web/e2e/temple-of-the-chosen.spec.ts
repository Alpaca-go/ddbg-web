import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

test("Temple of the Chosen：怪物技能结束触发治疗及全体压力", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let game: GameState;
  try {
    const fixture = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/hall-ascension.ts", import.meta.url),
      ),
    );
    game = fixture.hallAscensionFixture();
    const { approvedTempleOfTheChosen: tile } = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/data/src/normalize/temple-of-the-chosen.ts", import.meta.url),
      ),
    );
    const { roomTileBattleAreas } = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/battle-monster-movement.ts", import.meta.url),
      ),
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        roomName: tile.name,
        encounter: { ...game.battle!.encounter!, turn: { type: "monster", actorId: "m" } },
        areas: roomTileBattleAreas(tile),
        entities: game.battle!.entities.map((e) => ({
          ...e,
          areaId: e.side === "monster" ? "A" : "B",
          ...(e.side === "hero" ? { stress: 0 } : { wounds: Math.min(4, e.life! - 1) }),
        })),
      },
    };
  } finally {
    await server.close();
  }
  await page.goto("/?phase=3");
  // 明示房间交互/资源夹具，不声称从自然战役取得XP或伪造存档。
  await page.evaluate(async (game) => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, game);
  await page.getByRole("button", { name: "怪物选招与选目标", exact: true }).click();
  await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, events } = useDungeonStore.getState();
    return {
      heroes: game.battle.entities.filter((e: { side: string }) => e.side === "hero"),
      monster: game.battle.entities.find((e: { id: string }) => e.id === "m"),
      rite: events.filter(
        (e: { type: string; trigger?: string }) =>
          e.type === "passiveTriggered" && e.trigger === "riteOfTheChosen",
      ),
      refused: events.filter((e: { type: string }) => e.type === "commandRefused"),
    };
  });
  expect(result.monster.areaId).toBe("A");
  expect(result.monster.wounds).toBe(0);
  expect(result.heroes.map((h: { stress: number }) => h.stress)).toEqual([1, 1, 1, 1]);
  expect(result.rite).toHaveLength(1);
  expect(result.refused).toEqual([]);
  expect(errors).toEqual([]);
});
