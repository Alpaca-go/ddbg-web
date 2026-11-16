import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
test("Shrieker 机制检查点：页面部署与三先攻；真实 reserve 日志导入刷新恢复并继续", async ({
  page,
}) => {
  test.setTimeout(180000);
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    configLoader: "runner",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let fixture: ReturnType<(typeof import("./fixtures/shrieker-i"))["shriekerUiFixture"]>;
  try {
    const { taskSources } = await server.ssrLoadModule(
      fileURLToPath(new URL("../src/dungeon-sandbox/task-sources.ts", import.meta.url)),
    );
    const { shriekerUiFixture } = await server.ssrLoadModule(
      fileURLToPath(new URL("./fixtures/shrieker-i.ts", import.meta.url)),
    );
    fixture = shriekerUiFixture(taskSources);
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
  const current = () =>
    page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands } = useDungeonStore.getState();
      return { game, commands };
    });
  await install(fixture.bound);
  await page.getByRole("button", { name: "部署 Shrieker I 战斗", exact: true }).click();
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await page.getByRole("button", { name: "开始战斗", exact: true }).click();
  expect(
    (await current()).game.battle.encounter.deck.filter((s: string) => s === "monster"),
  ).toHaveLength(3);
  expect((await current()).game.dungeon.bossCombatThreatCeased).toBe("boss:weald:shrieker:1");
  const input = {
    name: "shrieker-reserve.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture.save)),
  };
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input);
  await expect(page.getByText(/Murder of Magpies：全部补给骰结束/)).toBeVisible();
  const loaded = await current();
  const label = fixture.reserve.dungeon!.pending!.options[0]!.label;
  await page.reload();
  await page.getByLabel("导入存档文件", { exact: true }).setInputFiles(input);
  await expect(page.getByText(/Murder of Magpies：全部补给骰结束/)).toBeVisible();
  expect(await current()).toEqual(loaded);
  await page.getByRole("button", { name: label, exact: true }).first().click();
  expect((await current()).game.dungeon.explorationSetup.provisions).toHaveLength(
    fixture.reserve.dungeon!.explorationSetup!.provisions.length - 1,
  );
  expect((await current()).game.dungeon.shriekerTheft).toBeUndefined();
});
