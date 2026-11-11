import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);

test("Evil Eye毁眼：两行动、正面怪癖、全体减压与按钮关闭", async ({ page }) => {
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
    const { approvedEvilEye: tile } = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/data/src/normalize/evil-eye.ts", import.meta.url)),
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
        areas: roomTileBattleAreas(tile),
        entities: game.battle!.entities.map((e) => ({
          ...e,
          areaId: e.side === "monster" ? "C" : e.id === "hero-0" ? "E" : "G",
          ...(e.side === "hero" ? { stress: 6 } : {}),
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
  await page
    .getByRole("button", { name: "摧毁眼睛（2行动，正面怪癖、全体压力−5）", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^摧毁眼睛/ })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return {
      destroyed: game.battle.evilEyeDestroyed,
      heroes: game.battle.entities.filter((e: { side: string }) => e.side === "hero"),
      turn: game.battle.encounter.turn.type,
      commands: commands.map((c: { type: string }) => c.type),
      refused: events.filter((e: { type: string }) => e.type === "commandRefused"),
    };
  });
  expect(result.destroyed).toBe(true);
  expect(result.heroes.map((h: { stress: number }) => h.stress)).toEqual([1, 1, 1, 1]);
  expect(result.heroes[0].quirkIds).toHaveLength(1);
  expect(result.turn).toBe("awaitingInitiative");
  expect(result.commands).toEqual(["destroyEvilEye"]);
  expect(result.refused).toEqual([]);
  expect(errors).toEqual([]);
});
