import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);

test("升华大厅B区选择英雄升级：扣XP金币、压力结算、空槽保留", async ({ page }) => {
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
    .getByRole("button", { name: "升华（2行动、压力+3，另付XP/金币）", exact: true })
    .click();
  await page.screenshot({
    path: fileURLToPath(new URL("../../../.cache/hall-runtime-choice.png", import.meta.url)),
    fullPage: true,
  });
  await page.getByRole("button", { name: /^英雄升级至2级/ }).click();
  const result = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return {
      hero: game.dungeon.heroes[0],
      entity: game.battle.entities.find((e: { id: string }) => e.id === "hero-0"),
      gold: game.battle.loot.gold,
      commands: commands.map((c: { type: string }) => c.type),
      refused: events.filter((e: { type: string }) => e.type === "commandRefused"),
    };
  });
  expect(result.hero).toMatchObject({ level: 2, xp: 16, hallAscensionVacantSlots: 1 });
  expect(result.entity).toMatchObject({ heroLevel: 2, stress: 3, wounds: 7 });
  expect(result.entity.skillIds).toHaveLength(3);
  expect(result.gold).toBe(18);
  expect(result.commands).toEqual(["hallAscension", "resolveChoice"]);
  expect(result.refused).toEqual([]);
  expect(errors).toEqual([]);
});
