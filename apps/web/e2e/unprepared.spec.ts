import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
test("自然 seed2 Ambush：开始战斗施加全房间减益与版本命令", async ({ page }) => {
  test.setTimeout(180000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: { before: GameState; after: GameState };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/unprepared.ts", import.meta.url)),
      )
    ).unpreparedQuest();
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
  }, fixture.before);
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const { game, commands, events } = useDungeonStore.getState();
        return {
          entities: game.battle.entities,
          encounter: game.battle.encounter,
          rngCursor: game.battle.rngCursor,
          command: commands.findLast((c: { type: string }) => c.type === "startBattle"),
          triggered: events.filter(
            (e: { type: string; trigger?: string }) =>
              e.type === "passiveTriggered" && e.trigger === "unprepared",
          ).length,
        };
      }),
    )
    .toMatchObject({
      entities: fixture.after.battle!.entities,
      encounter: fixture.after.battle!.encounter,
      rngCursor: fixture.after.battle!.rngCursor,
      command: { type: "startBattle", wealdUnprepared: true },
      triggered: 1,
    });
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toHaveCount(0);
});
