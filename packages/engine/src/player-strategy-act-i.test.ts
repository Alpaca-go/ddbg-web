import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { hamletActionOptions } from "./hamlet-actions";
import { ensureCoreBossScriptsRegistered } from "./boss/ensure-core-boss-scripts";
import type { BasicQuestId } from "../../data/src/basic-quests";
import { coreQuestSources as sources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";

/**
 * 玩家策略（不是自然策略，R-190 允许）：seed 2 固定。
 * 1. 开局 `establishImminentThreat`（spec §2.4）；
 * 2. 任务：有 p019 打 Boss，否则按清剿优先级 p001→p002→p003→p004→p005；
 * 3. 战斗：保守打分（击杀优先、避免英雄掉血），每间房后伤口+压力 > 6 就休息；
 * 4. 村庄：先治疗建筑（heal10/heal5/tavern6/tavern3），再任取一个被接受的行动。
 * 目标：Act I 两个普通任务后 `quest:p019` 正常进入 offer（Boss 战术与跨幕存档另算）。
 */
function playerStrategyActI(seed: number) {
  ensureCoreBossScriptsRegistered();
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
      result.events.filter((e) => e.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    game = result.state;
    commands.push(command);
  };
  const settle = () => {
    for (let i = 0; i < 400; i++) {
      const d = game.dungeon!;
      if (d.deathTrinketChoice) {
        step({ type: "resolveChoice", choiceId: d.deathTrinketChoice.id, optionId: "discard" });
        continue;
      }
      if (d.replacementPreparation) {
        step({
          type: "resolveChoice",
          choiceId: d.replacementPreparation.choice.id,
          optionId: d.replacementPreparation.choice.options[0]!.id,
        });
        continue;
      }
      if (d.pending) {
        step({ type: "resolveChoice", choiceId: d.pending.id, optionId: d.pending.options[0]!.id });
        continue;
      }
      break;
    }
  };
  const hamlet = () => {
    for (let guard = 0; guard < 200; guard++) {
      const h = game.dungeon!.hamlet!;
      if (h.phase === "preparationComplete") return;
      if (h.phase === "awaitingCaretaker") {
        step({ type: "rollHamletCaretaker" });
        continue;
      }
      const healFirst = ["heal10", "heal5", "tavern6", "tavern3"];
      const options = hamletActionOptions(game);
      const ordered = [
        ...options.filter(
          (option) =>
            option.command.type === "visitHamletBuilding" &&
            healFirst.includes(option.command.serviceId),
        ),
        ...options,
      ];
      const accepted = ordered
        .map((option) => option.command)
        .find(
          (command) => !applyCommand(game, command).events.some((e) => e.type === "commandRefused"),
        );
      if (!accepted) throw new Error(`村庄无可用行动 phase=${h.phase}`);
      step(accepted);
      settle();
    }
    throw new Error("村庄行动循环超限");
  };
  const returnToHamlet = () => {
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
    hamlet();
  };

  step({ type: "establishImminentThreat" });
  const quests: string[] = [];
  for (let round = 0; round < 2; round++) {
    const questId = game.dungeon!.questDistribution!.questId as BasicQuestId;
    quests.push(questId);
    const run = naturalQuest(seed, questId, false, sources, 4, {
      continueFrom: game,
      handleDeaths: true,
      survival: true,
      restThreshold: 6,
    });
    commands.push(...run.commands);
    game = run.state;
    expect(game.dungeon!.campaignFailure, JSON.stringify(run.events)).toBeFalsy();
    returnToHamlet();
    step({ type: "offerNextQuest" });
    const offers = game.dungeon!.nextQuestOffers ?? [];
    if (round === 1) {
      expect(offers, JSON.stringify(offers)).toContain("quest:p019");
      step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "quest:p019" });
      step({ type: "rollDungeonProvisions" });
      settle();
      return { game, commands, quests, offers };
    }
    const preference = [
      "quest:p001",
      "quest:p002",
      "quest:p003",
      "quest:p004",
      "quest:p005",
      "quest:p019",
    ];
    const pick = preference.find((id) => offers.includes(id as never)) ?? offers[0]!;
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: pick });
    step({ type: "rollDungeonProvisions" });
    settle();
  }
  throw new Error("Act I 链未走完");
}

it("玩家策略链：两个普通任务后 p019 进入 offer，Boss 流程无引擎冲突（seed 2）", () => {
  const run = playerStrategyActI(2);
  expect(run.quests).toEqual(["quest:p001", "quest:p002"]);
  expect(run.offers).toContain("quest:p019");
  expect(run.game.dungeon!.phase).toBe("ready");
  expect(run.game.dungeon!.questDistribution!.questId).toBe("quest:p019");
  expect(run.game.dungeon!.activeBossThreatScriptId).toBe("boss:ruins:fanatic:1");

  // Boss 战输赢是玩家决策，不是本测试目标；这里只要求正常流程没有引擎拒绝 / 卡死。
  const boss = naturalQuest(2, "quest:p019", true, sources, 4, {
    continueFrom: run.game,
    handleDeaths: true,
    survival: true,
    restThreshold: 6,
  });
  expect(boss.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  if (boss.stopReason)
    expect(boss.stopReason, boss.stopReason).toMatch(
      /heroesDefeated|战役已失败|awaitingReplacement/,
    );
  // 至少打完一场战斗；输赢与是否走到 Boss 房都交给玩家决策。
  expect(boss.events.some((event) => event.type === "battleFinished")).toBe(true);
}, 120000);
