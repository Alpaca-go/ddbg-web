import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";
const test = ssrTest(import.meta.url);
test("Shrieker II页面旧检查点切换新口径：拾箱不掷补给骰或选Wild", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: GameState;
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/shrieker-ii-skip-rolls.ts", import.meta.url)),
      )
    ).shriekerSkipRollsUiFixture();
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  await page.evaluate(async (game) => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, fixture);
  await page.getByRole("tab", { name: "战利品", exact: true }).click();
  await page.getByRole("button", { name: "拾取同区宝箱", exact: true }).click();
  const actual = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return { game, commands, events };
  });
  expect(actual.commands[0].shriekerProvisionSkipRolls).toBe(true);
  expect(actual.game.dungeon.shriekerProvisionSkipRolls).toBe(true);
  expect(actual.game.battle.rngCursor).toBe(fixture.battle!.rngCursor);
  expect(actual.game.battle.provisions).toEqual(fixture.battle!.provisions);
  expect(actual.game.battle.loot.placed).toEqual([]);
  expect(actual.game.battle.loot.claimedIds).toHaveLength(1);
  expect(actual.game.battle.encounter.turn).toMatchObject({ type: "hero", actions: 1 });
  expect(
    actual.events.filter(
      (e: { type: string }) => e.type === "commandRefused" || e.type === "provisionRolled",
    ),
  ).toEqual([]);
  expect(actual.game.battle.pending).toBeNull();
  expect(errors).toEqual([]);
});
