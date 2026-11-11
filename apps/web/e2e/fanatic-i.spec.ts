import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);

test("Fanatic I 正式页面部署、开战布置 Pyre 及胜利回地图", async ({ page }) => {
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
      fileURLToPath(new URL("./fixtures/prophet-i.ts", import.meta.url)),
    );
    game = fixture.ruinsRoomFixture("standard", "fanatic");
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
  await page.getByRole("button", { name: "抽房间牌并匹配战斗板块", exact: true }).click();
  const deploy = page.getByRole("button", { name: "部署 Fanatic I 战斗", exact: true });
  await deploy.click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  const opened = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands } = useDungeonStore.getState();
    return {
      fanatic: game.battle.entities.find((e: { id: string }) => e.id === "boss:fanatic:1"),
      pyre: game.battle.entities.find((e: { id: string }) => e.id === "boss:fanatic:pyre"),
      turn: game.battle.encounter.turn.type,
      commands: commands.map((command: { type: string }) => command.type),
    };
  });
  expect(opened.fanatic).toMatchObject({ areaId: "B", stance: "aggressive" });
  expect(opened.pyre).toMatchObject({ areaId: "E", stance: "ranged" });
  expect(opened.turn).toBe("awaitingInitiative");
  expect(opened.commands).toEqual(["prepareDungeonBattle", "deployFanaticI", "startBattle"]);
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
