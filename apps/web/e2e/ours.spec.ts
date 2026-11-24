import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("seed21 Ours!：页面拾箱奖励续接与全房间状态", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: {
    before: GameState;
    beforeStart: GameState;
    after: GameState;
    attack: Command;
    beforePickup: GameState;
    pickupSteps: Command[];
  };
  try {
    fixture = (
      await server.ssrLoadModule(fileURLToPath(new URL("./fixtures/ours.ts", import.meta.url)))
    ).oursQuest();
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  const install = (game: GameState) =>
    page.evaluate(async (game) => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
    }, game);
  await install(fixture.beforeStart);
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  expect(
    await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      return useDungeonStore.getState().game.battle.wealdOurs;
    }),
  ).toBe(true);
  await install(fixture.beforePickup);
  for (const step of fixture.pickupSteps) {
    if (step.type === "interactLoot") {
      const dock = page.getByTestId("tabletop-action-dock");
      await dock.getByRole("tab", { name: "战利品", exact: true }).click();
      await dock.getByRole("button", { name: "拾取同区宝箱", exact: true }).click();
    } else if (step.type === "resolveChoice") {
      const stepId = step.optionId;
      const choice = await page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        return useDungeonStore.getState().game.battle.pending.choice;
      });
      expect(choice.id).toBe(step.choiceId);
      const option = choice.options.find((o: { id: string }) => o.id === stepId);
      await page.getByRole("button", { name: option.label, exact: true }).click();
    } else throw new Error(`非拾箱命令 ${step.type}`);
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const { game, commands, events } = useDungeonStore.getState();
        return {
          entities: game.battle.entities,
          loot: game.battle.loot,
          provisions: game.battle.provisions,
          encounter: game.battle.encounter,
          rngCursor: game.battle.rngCursor,
          command: commands.at(-1),
          triggered: events.filter(
            (e: { type: string; trigger?: string }) =>
              e.type === "passiveTriggered" && e.trigger === "ours",
          ).length,
        };
      }),
    )
    .toMatchObject({
      entities: fixture.after.battle!.entities,
      loot: fixture.after.battle!.loot,
      provisions: fixture.after.battle!.provisions,
      encounter: fixture.after.battle!.encounter,
      rngCursor: fixture.after.battle!.rngCursor,
      command: fixture.attack,
      triggered: 1,
    });
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toHaveCount(0);
});
