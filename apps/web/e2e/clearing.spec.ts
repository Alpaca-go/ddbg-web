import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../packages/engine/src/command";

const test = ssrTest(import.meta.url);
for (const kind of ["monster", "hero"] as const)
  test(`seed21 Clearing：页面结束回合 ${kind}`, async ({ page }) => {
    test.setTimeout(180000);
    const server = await createServer({
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      configLoader: "runner",
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true },
    });
    let fixture: { before: GameState; beforeStart: GameState; after: GameState; attack: Command };
    try {
      fixture = (
        await server.ssrLoadModule(
          fileURLToPath(new URL("./fixtures/clearing.ts", import.meta.url)),
        )
      ).clearingQuest(kind);
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
    await install(fixture.beforeStart);
    await page.getByRole("button", { name: "开始战斗", exact: true }).click();
    expect(
      await page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const b = useDungeonStore.getState().game.battle;
        return (
          b.wealdClearingMonsters &&
          b.areas.find((a: { id: string }) => a.id === "B").endTurnStress === -1
        );
      }),
    ).toBe(true);
    await install(fixture.before);
    const labels: Record<string, string> = {
      playMonsterSkill: "结算怪物技能",
      moveMonsterToRange: "怪物移动到射程",
      resolveShuffles: "结算位移",
      prepareMonsterAction: "怪物选招与选目标",
    };
    if (fixture.attack.type === "resolveChoice") {
      const choice = fixture.before.battle!.pending!.choice;
      expect(choice.id).toBe(fixture.attack.choiceId);
      const optionId = fixture.attack.optionId;
      const option = choice.options.find((o) => o.id === optionId)!;
      await page.getByRole("button", { name: option.label, exact: true }).click();
    } else if (fixture.attack.type === "moveHero") {
      await page
        .getByTestId("tabletop-action-dock")
        .getByRole("tab", { name: "移动", exact: true })
        .click();
      for (const id of fixture.attack.path)
        await page.getByRole("button", { name: `前往 ${id}`, exact: true }).click();
      await page
        .getByRole("button", {
          name: fixture.attack.path.length ? "确认移动" : "原地移动（花1行动）",
          exact: true,
        })
        .click();
    } else if (fixture.attack.type === "changeStance") {
      await page
        .getByTestId("tabletop-action-dock")
        .getByRole("tab", { name: "换姿态", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: fixture.attack.direction === "forward" ? "向前换姿态" : "向后换姿态",
          exact: true,
        })
        .click();
    } else {
      const label = labels[fixture.attack.type];
      expect(label).toBeDefined();
      await page.getByRole("button", { name: label!, exact: true }).click();
    }
    await expect
      .poll(() =>
        page.evaluate(async (kind) => {
          const path = "/src/dungeon-sandbox/store.ts";
          const { useDungeonStore } = await import(/* @vite-ignore */ path);
          const { game, commands, events } = useDungeonStore.getState();
          return {
            loot: game.battle.loot,
            entities: game.battle.entities,
            encounter: game.battle.encounter,
            rngCursor: game.battle.rngCursor,
            command: commands.at(-1),
            triggered: events.filter((e: { type: string; trigger?: string; message?: string }) =>
              kind === "monster"
                ? e.type === "passiveTriggered" && e.trigger === "clearing"
                : e.type === "areaStressResolved" && e.message?.startsWith("Clearing"),
            ).length,
          };
        }, kind),
      )
      .toMatchObject({
        loot: fixture.after.battle!.loot,
        entities: fixture.after.battle!.entities,
        encounter: fixture.after.battle!.encounter,
        rngCursor: fixture.after.battle!.rngCursor,
        command: fixture.attack,
        triggered: 1,
      });
    await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
    await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toHaveCount(0);
  });
