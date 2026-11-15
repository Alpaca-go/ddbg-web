import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
test("自然 seed4 星区未命中：页面派发版本命令并显示腐蚀", async ({ page }) => {
  test.setTimeout(180000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: { before: GameState; beforeAttack: GameState; after: GameState };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/toxic-mushrooms.ts", import.meta.url)),
      )
    ).toxicMushroomsQuest();
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
  }, fixture.beforeAttack);
  await page.getByRole("button", { name: "结算怪物技能", exact: true }).click();
  await page.getByRole("button", { name: "结算位移", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const { game, commands, events } = useDungeonStore.getState();
        return {
          entities: game.battle.entities,
          command: commands.findLast((c: { type: string }) => c.type === "playMonsterSkill"),
          triggered: events.some(
            (e: { type: string; trigger?: string }) =>
              e.type === "passiveTriggered" && e.trigger === "toxicMushrooms",
          ),
        };
      }),
    )
    .toMatchObject({
      entities: fixture.after.battle!.entities,
      command: { type: "playMonsterSkill", toxicMushrooms: true },
      triggered: true,
    });
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
});
