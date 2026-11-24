import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("W-03 seed3：怪物穿过零容量区与结束回合守卫", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: {
    before: GameState;
    action: Command;
    after: GameState;
    skill: Command;
    finished: GameState;
    illegal: GameState;
  };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("../fixtures/monster-zero-capacity.ts", import.meta.url)),
      )
    ).monsterZeroCapacityQuest();
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
  await install(fixture.before);

  const read = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands, events } = useDungeonStore.getState();
      return { game, commands, events };
    });
  await page.getByRole("button", { name: "怪物移动到射程", exact: true }).click();
  expect((await read()).game).toEqual(fixture.after);
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  expect((await read()).game).toEqual(fixture.finished);
  expect((await read()).commands).toEqual([fixture.action, fixture.skill]);
  // 非法落点是显式机制夹具，独立于上面的真实公开日志。
  await install(fixture.illegal);
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  const refused = await read();
  expect(refused.game).toEqual(fixture.illegal);
  expect(refused.commands).toEqual([]);
  expect(refused.events).toContainEqual(
    expect.objectContaining({ type: "commandRefused", message: expect.stringContaining("W-03") }),
  );
  await expect(
    page.getByText("零容量区域不能结束回合，须经该区域穿过（W-03）", { exact: true }),
  ).toBeVisible();
});
