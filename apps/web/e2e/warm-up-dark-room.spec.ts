import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

test("Warm Up暗房光照5仍提供Torch清理入口", async ({ page }) => {
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
        new URL("../../../packages/engine/src/test-helpers/warm-up-dark-room.ts", import.meta.url),
      ),
    );
    const engine = await server.ssrLoadModule(
      fileURLToPath(new URL("../../../packages/engine/src/command.ts", import.meta.url)),
    );
    const result = engine.applyCommand(fixture.warmUpDarkRoomFixture(), {
      type: "resolveDungeonRoom",
    });
    expect(result.events.filter((e: { type: string }) => e.type === "commandRefused")).toEqual([]);
    game = result.state;
    // 光照已满的明示边界夹具，不声称自然获取补给或完成III级任务。
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        explorationSetup: { ...game.dungeon!.explorationSetup!, light: 5 },
      },
    };
  } finally {
    await server.close();
  }
  await page.goto("/?phase=3");
  await page.evaluate(async (game) => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, game);
  await page.getByRole("button", { name: "使用火把：光照 +1", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "使用火把：光照 +1", exact: true })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game, commands } = useDungeonStore.getState(),
      d = game.dungeon;
    return {
      room: d.rooms.find((r: { id: string }) => r.id === d.position),
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions.length,
      commands: commands.map((c: { type: string }) => c.type),
    };
  });
  expect(result).toMatchObject({
    room: { kind: "dark", cleared: true },
    light: 5,
    provisions: 3,
    commands: ["useProvision"],
  });
  expect(errors).toEqual([]);
});
