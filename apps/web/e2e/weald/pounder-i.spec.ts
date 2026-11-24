import { expect } from "@playwright/test";
import { ssrTest } from "../core/ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("Pounder真实检查点：页面部署、单怪物先攻、增援回合与新战役版本", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const server = await createServer({
    configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: { initial: GameState; bound: GameState; turn: GameState };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("../fixtures/pounder-i.ts", import.meta.url)),
      )
    ).pounderUiFixture();
  } finally {
    await server.close();
  }
  await page.goto("/");
  await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
  await page.getByRole("button", { name: "进入地牢", exact: true }).click();
  const install = async (game: GameState) =>
    page.evaluate(async (game) => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
    }, game);
  const current = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      return useDungeonStore.getState().game;
    });
  await install(fixture.bound);
  await page.getByRole("button", { name: "部署 Brigand Pounder I 战斗", exact: true }).click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  expect(
    (await current()).battle.encounter.deck.filter((side: string) => side === "monster"),
  ).toHaveLength(1);
  await install(fixture.turn);
  await expect(page.getByText("Pounder 行动", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "怪物选招与选目标", exact: true }).click();
  expect(
    (await current()).battle.entities.filter((e: { id: string }) =>
      e.id.startsWith("pounder-summon:"),
    ),
  ).toHaveLength(3);
  await install(fixture.initial);
  await expect(
    page.getByText(
      "从遗迹与 Weald 的七位 Boss 中随机确定迫近威胁。Weald 已开放 Hag、Brigand Pounder 与 Shrieker 的 I／II／III 级战斗。",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "抽取迫近威胁", exact: true }).click();
  await expect(page.getByTestId("initial-threat-result")).toContainText("Brigand Pounder I");
  await expect(page.getByRole("button", { name: "掷开局补给骰", exact: true })).toBeEnabled();
  expect((await current()).dungeon.pounderBossBattles).toBe(true);
  expect(errors).toEqual([]);
});
