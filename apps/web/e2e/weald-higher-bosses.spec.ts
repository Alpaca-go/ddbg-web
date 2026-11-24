import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/shared/core/command";
const test = ssrTest(import.meta.url);
for (const identity of ["hag", "brigandPounder", "shrieker"] as const) {
  test(`${identity} II／III 页面部署、开战与检查点恢复`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const server = await createServer({
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      configLoader: "runner",
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true },
    });
    let fixtures: GameState[];
    try {
      const module = await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/weald-higher-bosses.ts", import.meta.url)),
      );
      fixtures = [module.higherBossUiFixture(identity, 2), module.higherBossUiFixture(identity, 3)];
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
        return useDungeonStore.getState().game;
      });
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i]!,
        level = i + 2,
        name =
          identity === "brigandPounder"
            ? "Brigand Pounder"
            : identity === "hag"
              ? "Hag"
              : "Shrieker",
        label = `部署 ${name} ${level === 2 ? "II" : "III"} 战斗`;
      const { wealdHigherBosses: _version, ...legacy } = fixture.dungeon!;
      void _version;
      await install({ ...fixture, dungeon: legacy });
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
      await install(fixture);
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
      await page.getByRole("button", { name: "开始战斗", exact: true }).click();
      const started = await current();
      expect(started.battle.encounter.deck.filter((s: string) => s === "monster")).toHaveLength(
        identity === "hag" ? 3 : identity === "shrieker" ? 3 : 1,
      );
      expect(started.dungeon.bossCombatThreatCeased).toBe(`boss:weald:${identity}:${level}`);
      const life = started.battle.entities
        .filter((e: { side: string }) => e.side === "monster")
        .map((e: { life: number }) => e.life);
      expect(life).toEqual(
        identity === "hag"
          ? level === 2
            ? [75, 100]
            : [95, 136]
          : identity === "shrieker"
            ? level === 2
              ? [60, 30]
              : [72, 40]
            : level === 2
              ? [70]
              : [90],
      );
      await page.reload();
      await page.getByRole("button", { name: "前往出征准备", exact: true }).click();
      await page.getByRole("button", { name: "进入地牢", exact: true }).click();
      await install(JSON.parse(JSON.stringify(started)) as GameState);
      await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
      expect(await current()).toEqual(started);
    }
    expect(errors).toEqual([]);
  });
}
