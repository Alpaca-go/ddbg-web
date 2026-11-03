import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

for (const mode of ["standard", "radiant"] as const) {
  test(`Necromancer I正式入口：${mode}部署、开战与${mode === "standard" ? "胜利" : "全灭"}交接`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const server = await createServer({
      configFile: false,
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true },
    });
    let game: GameState;
    try {
      const fixture = await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/necromancer-i.ts", import.meta.url)),
      );
      game = fixture.necromancerRoomFixture(mode);
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
    }, game);
    await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
    await page.getByRole("button", { name: "抽房间牌并匹配战斗板块", exact: true }).click();
    const deploy = page.getByRole("button", { name: "部署 Necromancer I 战斗", exact: true });
    await expect(deploy).toBeVisible();
    await expect(
      page.getByRole("button", { name: "从完整 42 张怪物池抽牌并记录部署", exact: true }),
    ).toHaveCount(0);
    // 错级状态不得展示I级入口；不修改生产准入或存档。
    await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game } = useDungeonStore.getState();
      useDungeonStore.setState({
        game: { ...game, dungeon: { ...game.dungeon, campaignLevel: 2 } },
      });
    });
    await expect(deploy).toHaveCount(0);
    await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game } = useDungeonStore.getState();
      useDungeonStore.setState({
        game: { ...game, dungeon: { ...game.dungeon, campaignLevel: 1 } },
      });
    });
    await deploy.click();
    await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    const deployed = await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, commands } = useDungeonStore.getState();
      return {
        entities: game.battle.entities,
        turn: game.battle.encounter.turn.type,
        commands: commands.map((c: { type: string }) => c.type),
      };
    });
    expect(deployed.turn).toBe("awaitingInitiative");
    expect(
      deployed.entities
        .filter((e: { side: string }) => e.side === "hero")
        .map((e: { areaId: string }) => e.areaId),
    ).toEqual(["G", "G", "G", "G"]);
    expect(
      deployed.entities.find((e: { id: string }) => e.id === "boss:necromancer:1"),
    ).toMatchObject({ areaId: "A", life: 77 });
    expect(deployed.commands).toEqual([
      "prepareDungeonBattle",
      "deployNecromancerI",
      "startBattle",
    ]);
    // 显式终态夹具，仅验证页面交接；真实技能死亡与R38清场另有引擎测试。
    await page.evaluate(async (mode) => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game } = useDungeonStore.getState(),
        b = game.battle;
      useDungeonStore.setState({
        game: {
          ...game,
          battle: {
            ...b,
            entities: b.entities.map((e: { side: string }) => ({
              ...e,
              dead: mode === "standard" ? e.side === "monster" : e.side === "hero",
            })),
            encounter: {
              ...b.encounter,
              turn:
                mode === "standard"
                  ? { type: "finished", outcome: "victory" }
                  : { type: "halted", reason: "heroesDefeated", monstersDefeated: false },
            },
          },
        },
      });
    }, mode);
    await page
      .getByRole("button", {
        name: mode === "standard" ? "返回地牢地图" : "结算英雄全灭",
        exact: true,
      })
      .click();
    if (mode === "standard") {
      await expect(page.getByTestId("formal-dungeon-exploration")).toBeVisible();
      await expect(deploy).toHaveCount(0);
    } else {
      await expect(
        page.getByText("Boss任务英雄全灭，战役失败（R-044）。", { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "结算英雄全灭", exact: true })).toHaveCount(0);
    }
    const result = await page.evaluate(async () => {
      const path = "/src/dungeon-sandbox/store.ts";
      const { useDungeonStore } = await import(/* @vite-ignore */ path);
      const { game, events } = useDungeonStore.getState();
      return {
        victory: game.dungeon.bossQuestVictory,
        failure: game.dungeon.campaignFailure,
        refused: events.filter((e: { type: string }) => e.type === "commandRefused"),
      };
    });
    expect(result.refused).toEqual([]);
    if (mode === "standard") expect(result.victory).toBe(true);
    else expect(result.failure).toBe("bossQuestHeroesDefeated");
    expect(errors).toEqual([]);
  });
}
