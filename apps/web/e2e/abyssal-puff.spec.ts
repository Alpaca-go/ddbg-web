import { expect } from "@playwright/test";
import { ssrTest } from "./ssr-test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState, Command } from "../../../packages/engine/src/shared/core/command";

const test = ssrTest(import.meta.url);
test("seed1 Abyssal Puff：页面技能摧毁真菌与全房间增益", async ({ page }) => {
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
    beforeStart: GameState;
    after: GameState;
    attack: Command;
    uiAttack: Command;
  };
  try {
    fixture = (
      await server.ssrLoadModule(
        fileURLToPath(new URL("./fixtures/abyssal-puff.ts", import.meta.url)),
      )
    ).abyssalPuffQuest();
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
      return useDungeonStore.getState().game.battle.wealdAbyssalPuff;
    }),
  ).toBe(true);
  await install(fixture.before);
  const labels: Record<string, string> = {
    playMonsterSkill: "结算怪物技能",
    moveMonsterToRange: "怪物移动到射程",
    resolveShuffles: "结算位移",
    prepareMonsterAction: "怪物选招与选目标",
  };
  if (
    fixture.uiAttack.type === "playHeroSkill" ||
    fixture.uiAttack.type === "playHeroSkillTargets"
  ) {
    const attack = fixture.uiAttack;
    const dock = page.getByTestId("tabletop-action-dock");
    await dock.getByRole("tab", { name: "技能", exact: true }).click();
    await dock
      .getByRole("listbox", { name: "手牌技能" })
      .getByTestId(`card-face-${attack.skillId}`)
      .click();
    if (attack.type === "playHeroSkill") {
      await dock.getByLabel("目标", { exact: true }).selectOption(attack.targetId);
    } else {
      const areaId = fixture.before.battle!.entities.find(
        (e) => e.id === attack.targetIds[0],
      )!.areaId;
      await dock.getByLabel("目标区域", { exact: true }).selectOption(areaId);
      const entities = fixture.before.battle!.entities.filter(
        (e) => !e.dead && e.areaId === areaId,
      );
      const boxes = dock.getByRole("group", { name: "同区目标" }).getByRole("checkbox");
      for (let i = 0; i < entities.length; i++)
        if (attack.targetIds.includes(entities[i]!.id)) await boxes.nth(i).check();
    }
    await dock.getByRole("button", { name: "使用技能", exact: true }).click();
  } else if (fixture.uiAttack.type === "resolveChoice") {
    const choice = fixture.before.battle!.pending!.choice;
    expect(choice.id).toBe(fixture.uiAttack.choiceId);
    const optionId = fixture.uiAttack.optionId;
    const option = choice.options.find((o) => o.id === optionId)!;
    await page.getByRole("button", { name: option.label, exact: true }).click();
  } else {
    const label = labels[fixture.uiAttack.type];
    expect(label).toBeDefined();
    await page.getByRole("button", { name: label!, exact: true }).click();
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = "/src/dungeon-sandbox/store.ts";
        const { useDungeonStore } = await import(/* @vite-ignore */ path);
        const { game, commands, events } = useDungeonStore.getState();
        return {
          entities: game.battle.entities,
          encounter: game.battle.encounter,
          rngCursor: game.battle.rngCursor,
          command: commands.at(-1),
          triggered: events.filter(
            (e: { type: string; trigger?: string }) =>
              e.type === "passiveTriggered" && e.trigger === "abyssalPuff",
          ).length,
        };
      }),
    )
    .toMatchObject({
      entities: fixture.after.battle!.entities,
      encounter: fixture.after.battle!.encounter,
      rngCursor: fixture.after.battle!.rngCursor,
      command: fixture.uiAttack,
      triggered: 1,
    });
  await expect(page.getByRole("region", { name: "区域板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始战斗", exact: true })).toHaveCount(0);
});
