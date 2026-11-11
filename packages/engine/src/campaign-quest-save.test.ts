import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreQuestSources as sources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";

/**
 * 战役级存档：`start` 是战役第一任务，日志覆盖整段战役（回村、村庄、抽选下一任务）。
 * 用公开命令驱动（R-190：不调策略/种子；沿用既有自然任务场景 seed 2）。
 */
function campaignPrefix() {
  const seed = 2;
  let game: GameState = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    naturalParty,
    sources,
  );
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    expect(
      result.events.filter((event) => event.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    game = result.state;
    commands.push(command);
    return result;
  };
  const settle = () => {
    for (let i = 0; i < 400; i++) {
      if (game.dungeon!.deathTrinketChoice) {
        step({
          type: "resolveChoice",
          choiceId: game.dungeon!.deathTrinketChoice.id,
          optionId: "discard",
        });
        continue;
      }
      if (game.dungeon!.pending) {
        const pending = game.dungeon!.pending!;
        step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
        continue;
      }
      break;
    }
  };
  const toPreparedHamlet = () => {
    step({ type: "beginReturnToHamlet" });
    settle();
    for (let i = 0; i < 100 && game.dungeon!.hamletReturn!.phase !== "provisions"; i++) {
      const d = game.dungeon!;
      if (d.hamletReturn!.phase !== "awaitingReplacement") break;
      step(
        d.preparedReplacements?.length
          ? { type: "joinPreparedReplacements" }
          : { type: "prepareReplacementHero" },
      );
      settle();
    }
    step({ type: "finishReturnToHamlet" });
    step({ type: "drawHamletEvent" });
    settle();
    if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") step({ type: "rollHamletCaretaker" });
    while (game.dungeon!.hamlet!.phase !== "preparationComplete") {
      if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
        step({ type: "rollHamletCaretaker" });
        continue;
      }
      const actorId = currentHamletHero(game)!.id;
      const speech = applyCommand(game, {
        type: "useHamletSkill",
        actorId,
        skill: "zealousSpeech",
      });
      if (!speech.events.some((event) => event.type === "commandRefused")) {
        step({ type: "useHamletSkill", actorId, skill: "zealousSpeech" });
        continue;
      }
      // 替补英雄可能未接村庄技能：改用建筑服务结束该英雄的行动（公开命令，不注入状态）。
      const service = hamletActionOptions(game)
        .map((option) => option.command)
        .find((command) => command.type === "visitHamletBuilding");
      if (!service) throw new Error(`村庄无法为 ${actorId} 结束行动`);
      step(service);
    }
  };

  const first = naturalQuest(seed, "quest:p001", false, sources, 4, {
    continueFrom: game,
    handleDeaths: true,
  });
  commands.push(...first.commands);
  game = first.state;
  toPreparedHamlet();
  step({ type: "offerNextQuest" });
  const offers = game.dungeon!.nextQuestOffers ?? [];
  expect(offers.length).toBeGreaterThan(0);
  step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: offers[0]! });
  expect(game.dungeon!.phase).toBe("awaitingProvisions");
  return {
    seed,
    game,
    commands,
    start: {
      seed,
      questId: "quest:p001" as const,
      mode: "radiant" as const,
      party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
    },
  };
}

it("跨任务战役存档：起点是战役第一任务，日志覆盖回村/村庄/抽选第二任务，可严格回放", () => {
  const prefix = campaignPrefix();
  expect(prefix.commands.length).toBeGreaterThan(10);
  const save = createQuestSave(prefix.start, prefix.commands, prefix.game, sources);
  expect(save.start.questId).toBe("quest:p001");
  expect(save.campaignLevel).toBe(1);
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), sources);
  expect(loaded.game).toEqual(prefix.game);
  expect(loaded.commands).toEqual(prefix.commands);
  // 保存会补入新战役的规则版本标记；读取必须保留实际写入的起点。
  expect(loaded.start).toEqual(save.start);
  // 第二任务已经选出：存档停在开局补给，而不是回到上一任务的结算。
  expect(loaded.game.dungeon!.pending).toBeNull();
  expect(loaded.game.dungeon!.questDistribution!.questId).not.toBe("quest:p001");
}, 120000);

it("战役等级声明参与校验：声明的等级与回放不一致即拒绝", () => {
  const prefix = campaignPrefix();
  const save = createQuestSave(prefix.start, prefix.commands, prefix.game, sources);
  const forgedLevel = JSON.parse(JSON.stringify(save));
  forgedLevel.campaignLevel = 2;
  expect(() => loadQuestSave(forgedLevel, sources)).toThrow("战役等级与回放不一致");
  const forgedGold = JSON.parse(JSON.stringify(save));
  forgedGold.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(forgedGold, sources)).toThrow();
  // 旧档缺省 campaignLevel 仍按回放校验，不强制升级。
  const legacy = JSON.parse(JSON.stringify(save));
  delete legacy.campaignLevel;
  expect(loadQuestSave(legacy, sources).game).toEqual(prefix.game);
}, 120000);

it("start 必须是战役起点：把当前任务当 start 无法保存跨任务状态", () => {
  const prefix = campaignPrefix();
  const wrongStart = { ...prefix.start, questId: "quest:p002" as const };
  expect(() => createQuestSave(wrongStart, prefix.commands, prefix.game, sources)).toThrow();
}, 120000);
