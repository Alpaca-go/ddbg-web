import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

test("升幕入口机制夹具：回村后推进II级，再抽村庄事件并记录命令", async ({ page }) => {
  test.setTimeout(90_000);
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let game: GameState;
  try {
    const fixture = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/ruins-act.ts", import.meta.url),
      ),
    );
    game = fixture.ruinsActReadyFixture(1, "necromancer");
  } finally {
    await server.close();
  }
  // 明确的回村状态注入；不伪造本机存档或宣称自然Boss战已完成。
  await page.goto("/?phase=3");
  await page.evaluate(async (game) => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    useDungeonStore.setState({ game, commands: [], events: [] });
  }, game);
  await expect(page.getByRole("button", { name: "抽村庄事件", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "推进战役至2级", exact: true }).click();
  await expect(page.getByTestId("ruins-act-advance")).toHaveCount(0);
  const log = await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game, commands } = useDungeonStore.getState();
    return {
      level: game.dungeon.campaignLevel,
      commands: commands.map((c: { type: string }) => c.type),
    };
  });
  expect(log).toEqual({ level: 2, commands: ["advanceRuinsAct"] });
  await page.getByRole("button", { name: "抽村庄事件", exact: true }).click();
  await expect(page.getByTestId("hamlet-event")).toBeVisible();
});
