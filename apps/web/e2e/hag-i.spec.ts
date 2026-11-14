import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
test("Hag 真实自然检查点：页面部署、3 张怪物先攻与释放选择", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: { bound: GameState; release: GameState; initial: GameState };
  try {
    fixture = (
      await server.ssrLoadModule(fileURLToPath(new URL("./fixtures/hag-i.ts", import.meta.url)))
    ).hagUiFixture();
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
  await install(fixture.bound);
  await page.getByRole("button", { name: "部署 Hag I 战斗", exact: true }).click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  const deck = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    return useDungeonStore.getState().game.battle.encounter.deck;
  });
  expect(deck.filter((side: string) => side === "monster")).toHaveLength(3);
  await install(fixture.release);
  const pending = fixture.release.battle!.pending!;
  if (pending.type !== "hagRelease") throw new Error("缺释放选择");
  await page.getByRole("button", { name: pending.choice.options[0]!.label, exact: true }).click();
  const released = await page.evaluate(async () => {
    const path = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ path);
    const { game } = useDungeonStore.getState();
    return {
      pending: game.battle.pending,
      captive: game.battle.hagCauldron,
      cursor: game.battle.rngCursor,
    };
  });
  expect(released.pending).toBeNull();
  expect(released.captive).toBeUndefined();
  expect(released.cursor).toBe(fixture.release.battle!.rngCursor);
  await install(fixture.initial);
  await expect(page.getByText(/遗迹与 Weald 的七位 Boss/)).toBeVisible();
  await page.getByRole("button", { name: "抽取迫近威胁", exact: true }).click();
  await expect(page.getByText("抽到的 Boss 尚未开放，已保留抽取结果，可保存战役。")).toBeVisible();
  await expect(page.getByRole("button", { name: "掷开局补给骰", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
