import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("W-03 seed2：页面穿过零容量区、暂留后必须移出", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let f: {
    before: GameState;
    enter: Command;
    leave: Command;
    through: Command;
    paused: GameState;
    after: GameState;
    crossed: GameState;
  };
  try {
    f = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("../fixtures/zero-capacity.ts", import.meta.url)),
      )
    ).zeroCapacityQuest();
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
  const read = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands } = useDungeonStore.getState();
      return { game, commands };
    });
  const move = async (c: Command) => {
    if (c.type !== "moveHero") throw new Error("非移动命令");
    await page
      .getByTestId("tabletop-action-dock")
      .getByRole("tab", { name: "移动", exact: true })
      .click();
    for (const id of c.path)
      await page.getByRole("button", { name: `前往 ${id}`, exact: true }).click();
    await page.getByRole("button", { name: "确认移动", exact: true }).click();
  };
  await install(f.before);
  await move(f.enter);
  expect((await read()).game).toEqual(f.paused);
  await expect(
    page.getByRole("button", { name: "原地移动（花1行动）", exact: true }),
  ).toBeDisabled();
  await page
    .getByTestId("tabletop-action-dock")
    .getByRole("tab", { name: "换姿态", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "向前换姿态", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "向后换姿态", exact: true })).toBeDisabled();
  expect((await read()).commands).toEqual([f.enter]);
  await move(f.leave);
  expect((await read()).game).toEqual(f.after);
  await install(f.before);
  await move(f.through);
  expect((await read()).game).toEqual(f.crossed);
  expect((await read()).commands).toEqual([f.through]);
});
