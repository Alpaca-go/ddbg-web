import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";
test("Disruption II room-entry fixture: seeded Objective card selection is logged and cannot reroll", async ({
  page,
}) => {
  test.setTimeout(90000);
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
        new URL("../../../packages/engine/src/test-helpers/disruption-room.ts", import.meta.url),
      ),
    );
    game = fixture.disruptionRoomFixture(1);
  } finally {
    await server.close();
  }
  // Explicit room-entry fixture, not a fabricated save or natural act-II campaign.
  await page.goto("/?phase=3");
  await page.evaluate(async (game) => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, game);
  await page.getByRole("button", { name: "抽房间牌并匹配战斗板块", exact: true }).click();
  await expect(page.getByTestId("dungeon-room-card")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "抽房间牌并匹配战斗板块", exact: true }),
  ).toHaveCount(0);
  const state = await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game, commands } = useDungeonStore.getState();
    return {
      cardId: game.dungeon.roomCards.active.cardId,
      cursor: game.dungeon.cursor,
      deck: game.dungeon.roomCards.deck,
      cleared:
        game.dungeon.rooms.find((r: { id: string }) => r.id === game.dungeon.position).cleared ??
        false,
      commands: commands.map((c: { type: string }) => c.type),
    };
  });
  expect(["room:p004", "room:p008"]).toContain(state.cardId);
  expect(state.cursor).toBe(game.dungeon!.cursor + 1);
  expect(state.deck).toBeNull();
  expect(state.cleared).toBe(false);
  expect(state.commands).toEqual(["prepareDungeonBattle"]);
  expect(errors).toEqual([]);
});
