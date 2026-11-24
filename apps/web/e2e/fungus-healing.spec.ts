import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("W-04 seed1：真菌存活时页面治疗原子拒绝", async ({ page }) => {
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
    heal: Command;
  };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/fungus-healing.ts", import.meta.url)),
      )
    ).fungusHealingQuest();
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

  if (fixture.heal.type !== "playHeroSkill") throw new Error("缺单目标治疗命令");
  const dock = page.getByTestId("tabletop-action-dock");
  await dock.getByRole("tab", { name: "技能", exact: true }).click();
  await dock
    .getByRole("listbox", { name: "手牌技能" })
    .getByTestId("card-face-hero_skill:core:h05:p094")
    .click();
  await dock.getByLabel("目标", { exact: true }).selectOption(fixture.heal.targetId);
  await dock.getByRole("button", { name: "使用技能", exact: true }).click();
  const actual = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game, commands, events } = useDungeonStore.getState();
    return { game, commands, events };
  });
  expect(actual.game).toEqual(fixture.before);
  expect(actual.commands).toEqual([]);
  expect(actual.events).toContainEqual(
    expect.objectContaining({ type: "commandRefused", message: expect.stringContaining("W-04") }),
  );
  await expect(
    page.getByText("Necrotic Fungus：场上有真菌时英雄不能被治疗（W-04）", { exact: true }),
  ).toBeVisible();
});
