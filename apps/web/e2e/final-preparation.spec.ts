import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import type { GameState } from "../../../packages/engine/src/command";

test("最暗胜利后最后四天准备：不展示事件卡，不误入普通任务", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let game: GameState;
  try {
    const fixture = await server.ssrLoadModule(
      fileURLToPath(
        new URL("../../../packages/engine/src/test-helpers/final-preparation.ts", import.meta.url),
      ),
    );
    game = fixture.finalPreparationFixture();
  } finally {
    await server.close();
  }
  await page.goto("/?phase=3");
  await page.evaluate(async (game) => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    useDungeonStore.setState({ game, commands: [], events: [], questStart: null });
  }, game);
  await expect(page.getByRole("button", { name: "抽村庄事件", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "开始最后四天准备", exact: true }).click();
  await expect(page.getByRole("heading", { name: "最后村庄准备" })).toBeVisible();
  for (let day = 1; day <= 4; day++) {
    await page
      .getByRole("button", {
        name: day === 1 ? "开始首日看守人" : `开始第 ${day} 天看守人`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: /Zealous Speech/ }).click();
  }
  await expect(
    page.getByText("最后四天准备已完成。最终战尚未接通，保留当前队伍与准备结果。", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "抽取下一任务", exact: true })).toHaveCount(0);
  // 显式已付铁匠计划/游商陈列夹具；不声称此测试自然购买服务。
  await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game } = useDungeonStore.getState(),
      d = game.dungeon;
    const ids = d.trinkets.cards
      .filter((c: { level: number }) => c.level === d.trinkets.level)
      .map((c: { id: string }) => c.id);
    useDungeonStore.setState({
      game: {
        ...game,
        dungeon: {
          ...d,
          heroes: d.heroes.map((h: { id: string }, i: number) =>
            i
              ? h
              : {
                  ...h,
                  nextQuestProvisionDice: 1,
                  nextQuestSkillUpgrades: [
                    { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p003" },
                  ],
                },
          ),
          trinkets: { ...d.trinkets, display: ids.slice(0, 2), deck: ids.slice(2) },
        },
      },
    });
  });
  await page.getByRole("button", { name: "准备最终战补给", exact: true }).click();
  await page.getByRole("button", { name: "掷最终战补给骰", exact: true }).click();
  for (let i = 0; i < 16; i++) {
    if (await page.getByText("最终战补给已就绪，等待开战。", { exact: true }).isVisible()) break;
    await page.getByRole("button", { name: "火把", exact: true }).click();
  }
  await expect(page.getByText("最终战补给已就绪，等待开战。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "准备最终战形态流程", exact: true }).click();
  await expect(
    page.getByText("形态顺序：Ancestor 1st Form → Gestating Heart → Heart of Darkness", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("跳过形态：Ancestor 2nd Form", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "准备最终战形态流程", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "掷最终战补给骰", exact: true })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/dungeon-sandbox/store.ts";
    const { useDungeonStore } = await import(/* @vite-ignore */ moduleUrl);
    const { game, commands } = useDungeonStore.getState();
    return {
      commands: commands.map((c: { type: string }) => c.type),
      memory: game.dungeon.hamletMemory,
      cursor: game.dungeon.cursor,
      provisions: game.dungeon.explorationSetup.provisions.length,
      phase: game.dungeon.phase,
      skills: game.dungeon.heroes[0].skillIds,
      display: game.dungeon.trinkets.display,
      trinketDeck: game.dungeon.trinkets.deck.length,
    };
  });
  expect(result.commands.filter((c: string) => c === "beginFinalPreparation")).toHaveLength(1);
  expect(result.commands).not.toContain("drawHamletEvent");
  expect(result.memory).toEqual(game.dungeon!.hamletMemory);
  expect(result.provisions).toBe(9);
  expect(result.skills).toContain("hero_skill:p003");
  expect(result.skills).not.toContain("hero_skill:p001");
  expect(result.display).toBeUndefined();
  expect(result.trinketDeck).toBe(12);
  expect(result.phase).toBe("inHamlet");
  expect(errors).toEqual([]);
});
