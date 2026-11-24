import { expect } from "@playwright/test";
import { ssrTest } from "../core/ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("R-245 seed2：页面结束回合触发 Poisonous Roots", async ({ page }) => {
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
  };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("../fixtures/poisonous-roots.ts", import.meta.url)),
      )
    ).poisonousRootsQuest();
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

  if (fixture.action.type !== "changeStance") throw new Error("缺换姿态命令");
  const dock = page.getByTestId("tabletop-action-dock");
  await dock.getByRole("tab", { name: "换姿态", exact: true }).click();
  await dock
    .getByRole("button", {
      name: fixture.action.direction === "forward" ? "向前换姿态" : "向后换姿态",
      exact: true,
    })
    .click();
  const actual = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return { game, commands, events };
  });
  expect(actual.game).toEqual(fixture.after);
  expect(actual.commands).toEqual([fixture.action]);
  expect(
    actual.events.filter(
      (e: { type: string; trigger?: string }) =>
        e.type === "passiveTriggered" && e.trigger === "poisonousRoots",
    ),
  ).toHaveLength(1);
});
