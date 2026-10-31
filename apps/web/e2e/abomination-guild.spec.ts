import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

test("憎恶公会机制夹具：变身卡连续永久升级并记录命令", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let game: GameState;
  try {
    const fixture = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/abomination-hamlet.ts", import.meta.url),
      ),
    );
    game = fixture.abominationHamletFixture();
  } finally {
    await server.close();
  }
  // 显式村庄资源/职业夹具；自然返村与正式存档回放由引擎场景覆盖。
  await page.goto("/?phase=3");
  await page.evaluate(async (game) => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, game);
  await page.getByRole("button", { name: "访问公会：永久升级英雄/技能", exact: true }).click();
  await page.getByRole("button", { name: /永久升级 Transform to Beast I→II/ }).click();
  await page.getByRole("button", { name: /永久升级 Transform to Beast II→III/ }).click();
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game, commands } = useDungeonStore.getState();
    return {
      skills: game.dungeon.heroes[0].skillIds,
      removed: game.dungeon.heroes[0].permanentlyRemovedSkillIds,
      xp: game.dungeon.heroes[0].xp,
      gold: game.dungeon.gold,
      commands: commands.map((c: { type: string }) => c.type),
    };
  });
  expect(result).toMatchObject({
    skills: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p222"],
    removed: ["hero_skill:p220", "hero_skill:p221"],
    xp: 6,
    gold: 98,
    commands: ["visitGuild", "resolveChoice", "resolveChoice"],
  });
  expect(errors).toEqual([]);
});
