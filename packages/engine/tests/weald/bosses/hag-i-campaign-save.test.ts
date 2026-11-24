import { ensureHagIBossScriptRegistered } from "../../../src/weald/bosses/hag-i";
import { resolveFaceTheThreatOfferAtNextQuest } from "../../../src/core/bosses/face-the-threat-embark-runtime";
import { applyCommand, type Command } from "../../../src/command";
import { createCoreDungeonQuest } from "../../../src/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../src/test-helpers/core-quest";
import { naturalQuest } from "../../../src/test-helpers/natural-quest";
import { drawInitialQuestOffers } from "../../../src/initial-quest-draw";
import { currentHamletHero, hamletActionOptions } from "../../../src/hamlet-actions";
import { countCompletedRegularQuestsAtCampaignLevel } from "../../../src/core/bosses/face-the-threat-embark-runtime";
import { createQuestSave, loadQuestSave } from "../../../src/quest-save";
import type { QuestStart } from "../../../../data/src/quest-save";
import { expect, it } from "vitest";

it("新地点版本只按实际回村普通任务计数，未选卡不计，Weald 与遗迹同计", () => {
  const initial = {
    bossLocationSources: true as const,
    discardedQuests: ["quest:p001", "quest:p002", "quest:p003"],
  };
  expect(countCompletedRegularQuestsAtCampaignLevel(initial, 1)).toBe(0);
  const one = {
    ...initial,
    completedRegularQuests: [{ questId: "quest:weald:p001", campaignLevel: 1 as const }],
  };
  expect(countCompletedRegularQuestsAtCampaignLevel(one, 1)).toBe(1);
  expect(
    countCompletedRegularQuestsAtCampaignLevel(
      {
        ...one,
        completedRegularQuests: [
          ...one.completedRegularQuests,
          { questId: "quest:p001", campaignLevel: 1 },
        ],
      },
      1,
    ),
  ).toBe(2);
});

// 固定完整 0–6 序列；沿用现有战斗及村庄 Speech/首个建筑服务策略，全部真实停点保留。
it.each([
  ...[false, true].flatMap((handleDeaths) =>
    [0, 1, 2, 3, 4, 5, 6].map((seed) => ({ seed, handleDeaths, skillFallback: false })),
  ),
  { seed: 6, handleDeaths: true, skillFallback: true },
])(
  "地点战役 seed $seed／既有替补流程 $handleDeaths／追加技能 $skillFallback：两普通任务后 Boss 的公开命令与日志",
  ({ seed, handleDeaths, skillFallback }) => {
    const packs = ["core", "weald"] as const;
    const mode = "hamlet-quest-draw:ruins-two" as const;
    const firstQuest = drawInitialQuestOffers(seed, packs, mode).offers[0]!;
    const start: QuestStart = {
      seed,
      questId: firstQuest,
      mode: "standard",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      contentPacks: [...packs],
      bossEdgeRooms: true,
      initialQuestDrawMode: mode,
    };
    let game = createCoreDungeonQuest(
      seed,
      firstQuest,
      "standard",
      coreParty,
      coreQuestSources,
      true,
      null,
      packs,
      mode,
    );
    const commands: Command[] = [];
    const stages: string[] = [];
    const checkpoints: string[] = [];
    // 固定原矩阵中跨任务最远的两个输入；恢复后继续同一命令流，不另选策略。
    const verifyCheckpoints = handleDeaths && (seed === 1 || skillFallback);
    const checkpoint = (label: string) => {
      if (!verifyCheckpoints) return;
      const before = game;
      const save = createQuestSave(start, commands, game, coreQuestSources);
      const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
      expect(restored).toEqual(before);
      const completed = before.dungeon!.completedRegularQuests!;
      expect(completed.length).toBeGreaterThan(0);
      // 删除、重复或改幕均不能用快照伪造已经完成的任务。
      for (const records of [
        completed.slice(1),
        [...completed, completed[0]!],
        completed.map((record) => ({ ...record, campaignLevel: 2 })),
      ]) {
        const tampered = {
          ...save,
          snapshot: {
            ...before,
            dungeon: { ...before.dungeon!, completedRegularQuests: records },
          },
        };
        expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), coreQuestSources)).toThrow(
          /快照与回放不一致/,
        );
      }
      const repeated = applyCommand(restored, { type: "finishReturnToHamlet" });
      expect(repeated.events.some((event) => event.type === "commandRefused")).toBe(true);
      expect(repeated.state).toEqual(restored);
      game = restored;
      checkpoints.push(label);
    };
    let stop: string | null = null;
    const step = (command: Command) => {
      const result = applyCommand(game, command);
      const refused = result.events.find((e) => e.type === "commandRefused");
      if (refused) throw new Error(`${command.type}: ${refused.message}`);
      game = result.state;
      commands.push(command);
      return result;
    };
    const settle = () => {
      for (let i = 0; i < 400; i++) {
        const d = game.dungeon!;
        if (d.deathTrinketChoice) {
          step({ type: "resolveChoice", choiceId: d.deathTrinketChoice.id, optionId: "discard" });
          continue;
        }
        if (handleDeaths && d.replacementPreparation) {
          step({
            type: "resolveChoice",
            choiceId: d.replacementPreparation.choice.id,
            optionId: d.replacementPreparation.choice.options[0]!.id,
          });
          continue;
        }
        if (d.pending) {
          step({
            type: "resolveChoice",
            choiceId: d.pending.id,
            optionId: d.pending.options[0]!.id,
          });
          continue;
        }
        return;
      }
      throw new Error("村庄待选循环超限");
    };
    const prepareHamlet = () => {
      step({ type: "beginReturnToHamlet" });
      settle();
      for (
        let i = 0;
        handleDeaths && i < 30 && game.dungeon!.hamletReturn!.phase === "awaitingReplacement";
        i++
      ) {
        step(
          game.dungeon!.preparedReplacements?.length
            ? { type: "joinPreparedReplacements" }
            : { type: "prepareReplacementHero" },
        );
        settle();
      }
      if (game.dungeon!.hamletReturn!.phase !== "provisions")
        throw new Error(`回村暂停：${game.dungeon!.hamletReturn!.phase}`);
      step({ type: "finishReturnToHamlet" });
      stages.push(`returned:${countCompletedRegularQuestsAtCampaignLevel(game.dungeon!, 1)}`);
      checkpoint(stages.at(-1)!);
      step({ type: "drawHamletEvent" });
      settle();
      for (let i = 0; i < 100 && game.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
        if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
          step({ type: "rollHamletCaretaker" });
          settle();
          continue;
        }
        const actorId = currentHamletHero(game)?.id;
        if (!actorId) throw new Error(`村庄暂停：${game.dungeon!.hamlet!.phase}`);
        const speech: Command = { type: "useHamletSkill", actorId, skill: "zealousSpeech" };
        const legal = !applyCommand(game, speech).events.some((e) => e.type === "commandRefused");
        const service = hamletActionOptions(game)
          .map((o) => o.command)
          .find((c) => c.type === "visitHamletBuilding");
        const fallback = skillFallback
          ? hamletActionOptions(game)
              .map((o) => o.command)
              .find((c) => c.type === "useHamletSkill")
          : undefined;
        if (legal) step(speech);
        else if (service) step(service);
        else if (fallback) step(fallback);
        else throw new Error("村庄无可用建筑服务");
        settle();
      }
      if (game.dungeon!.hamlet!.phase !== "preparationComplete")
        throw new Error("村庄行动循环超限");
    };
    try {
      step({ type: "establishImminentThreat", locationBosses: true, locationSources: true });
      if (game.dungeon!.unregisteredImminentThreatHold)
        stop = game.dungeon!.unregisteredImminentThreatHold!;
      for (let trip = 0; trip < 3 && !stop; trip++) {
        const questId = game.dungeon!.questDistribution!.questId as typeof firstQuest;
        stages.push(`quest:${questId}`);
        const run = naturalQuest(seed, questId, true, coreQuestSources, 2, {
          continueFrom: game,
          ...(handleDeaths ? { handleDeaths: true } : {}),
        });
        commands.push(...run.commands);
        game = run.state;
        if (run.stopReason) {
          stop = run.stopReason;
          break;
        }
        if (game.dungeon!.campaignFailure) {
          stop = game.dungeon!.campaignFailure!;
          break;
        }
        prepareHamlet();
        if (trip === 2) break;
        step({ type: "offerNextQuest" });
        if (game.dungeon!.pending?.id.startsWith("hamlet-quest-draw:"))
          step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: mode });
        const offers = game.dungeon!.nextQuestOffers!;
        if (trip === 0) expect(offers).not.toContain("quest:p019");
        if (trip === 1) expect(offers).toEqual(["quest:p019"]);
        step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: offers[0]! });
        checkpoint(`embarked:${offers[0]}`);
        if (trip === 1 && game.dungeon!.activeBossThreatScriptId === "boss:weald:hag:1")
          expect(game.dungeon!.bossExpeditionRegion).toBe("weald");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AssertionError") throw error;
      stop = error instanceof Error ? error.message : String(error);
    }
    if (verifyCheckpoints)
      expect(checkpoints).toEqual(
        seed === 1
          ? ["returned:1", "embarked:quest:p002", "returned:2", "embarked:quest:p019"]
          : ["returned:1", "embarked:quest:p001"],
      );
    expect({
      description: game.dungeon!.imminentThreatDescriptionCardId,
      stages,
      stop,
      phase: game.dungeon!.phase,
      ...(skillFallback
        ? {
            additionalSkills: commands.filter(
              (c) => c.type === "useHamletSkill" && c.skill !== "zealousSpeech",
            ),
          }
        : {}),
      ...(stop === "村庄无可用建筑服务"
        ? {
            villageChoices: hamletActionOptions(game).map((o) => o.label),
            currentHero: currentHamletHero(game)?.heroStatId,
          }
        : {}),
    }).toMatchSnapshot();
    if (stop === "村庄无可用建筑服务") {
      expect(game.dungeon!.phase).toBe("inHamlet");
      expect(hamletActionOptions(game).some((o) => o.command.type === "visitHamletBuilding")).toBe(
        false,
      );
    } else if (game.dungeon!.campaignFailure) {
      expect(stop).toBe(game.dungeon!.campaignFailure);
    } else if (stop && !game.dungeon!.unregisteredImminentThreatHold) {
      expect([
        "hero died",
        "dungeon halted awaitingReplacement",
        "battle halted: heroesDefeated",
        "bossQuestHeroesDefeated",
      ]).toContain(stop);
    }
    const save = createQuestSave(start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  },
  180000,
);

it("机制夹具：Hag 激活时一次已结算任务不开放 Boss，两次（含 Weald）才绑定 Hag", () => {
  ensureHagIBossScriptRegistered();
  const base = createCoreDungeonQuest(
    6,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  const first = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      bossLocationSources: true as const,
      questSummary: {
        questId: "quest:p001" as const,
        name: "Scout Ahead",
        clearedRoomIds: [],
        xpPerHero: 0,
        stagecoachXp: 0,
        awarded: true,
      },
      activeBossThreatScriptId: "boss:weald:hag:1" as const,
      imminentThreatDescriptionCardId: "boss_ability:weald:p013",
      completedRegularQuests: [{ questId: "quest:weald:p001", campaignLevel: 1 as const }],
    },
  };
  expect(resolveFaceTheThreatOfferAtNextQuest(first).kind).toBe("notApplicable");
  const second = {
    ...first,
    dungeon: {
      ...first.dungeon,
      completedRegularQuests: [
        ...first.dungeon.completedRegularQuests,
        { questId: "quest:p001", campaignLevel: 1 as const },
      ],
    },
  };
  const offered = resolveFaceTheThreatOfferAtNextQuest(second);
  expect(offered.kind).toBe("ok");
  if (offered.kind === "ok") expect(offered.plan.resolvedScriptId).toBe("boss:weald:hag:1");
});
