import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);

test("Templars 正式页面部署、双 Templar 落点及胜利回地图", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let game: GameState;
  try {
    const fixture = await server.ssrLoadModule(
      fileURLToPath(new URL("./fixtures/templars-i.ts", import.meta.url)),
    );
    game = fixture.templarsRoomFixture("radiant");
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
  }, game);
  const deploy = page.getByRole("button", { name: "部署 Templars 战斗", exact: true });
  await deploy.click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  const opened = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands } = useDungeonStore.getState();
    return {
      impaler: game.battle.entities.find(
        (e: { monsterCardId?: string }) => e.monsterCardId === "monster_large:p015",
      ),
      warlord: game.battle.entities.find(
        (e: { monsterCardId?: string }) => e.monsterCardId === "monster_large:p014",
      ),
      turn: game.battle.encounter.turn.type,
      deckSize: game.battle.encounter.deck.length,
      commands: commands.map((command: { type: string }) => command.type),
    };
  });
  expect(opened.impaler).toMatchObject({ areaId: "M", stance: "aggressive" });
  expect(opened.warlord).toMatchObject({ areaId: "C", stance: "ranged" });
  expect(opened.turn).toBe("awaitingInitiative");
  expect(opened.deckSize).toBe(8);
  expect(opened.commands).toEqual(["deployTemplarsI", "startBattle"]);
  await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game } = useDungeonStore.getState();
    const b = game.battle;
    useDungeonStore.setState({
      game: {
        ...game,
        battle: {
          ...b,
          entities: b.entities.map((e: { side: string }) => ({ ...e, dead: e.side === "monster" })),
          encounter: { ...b.encounter, deck: [], turn: { type: "finished", outcome: "victory" } },
        },
      },
    });
  });
  await page.getByRole("button", { name: "返回地牢地图", exact: true }).click();
  await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
  await expect(deploy).toHaveCount(0);
  expect(errors).toEqual([]);
});
