import { beforeEach, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { chooseNextQuest } from "../hamlet-embark";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import trinkets from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/normalize/schema";
import { createTrinketPool } from "../trinket-acquisition";
import {
  countCompletedRegularQuestsAtCampaignLevel,
  ensureNecromancerIBossScriptRegistered,
  ensureProphetIBossScriptRegistered,
  FACE_THE_THREAT_QUEST_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  PROPHET_I_SCRIPT_ID,
  readStoredFaceTheThreatEmbarkPlan,
  resolveFaceTheThreatEmbarkForChoose,
  shouldForceFaceTheThreatOfferAtNextQuest,
} from "./index";
import {
  ensureNecromancerIIBossScriptRegistered,
  NECROMANCER_II_SCRIPT_ID,
} from "./necromancer-ii";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

function hamletJourney(seed = 40) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  let result = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = result.state;
  while (result.pendingChoice) {
    result = applyCommand(game, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
  }
  result = applyCommand(game, { type: "leaveDungeon" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = ok(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "agree",
  });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    game = ok(game, { type });
  return game;
}

function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

function actEndTwoRegularQuestsFixture(): GameState {
  const base = hamletJourney(40);
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      discardedQuests: ["quest:p001", "quest:p003"],
      questSummary: {
        ...base.dungeon!.questSummary!,
        questId: "quest:p002",
        name: "Wipe ‘Em Out I",
        awarded: true,
      },
      activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
    },
  };
}

function hamletReadyForFaceEmbark(game: GameState = actEndTwoRegularQuestsFixture()): GameState {
  const ready = preparationReady(game);
  const offered = applyCommand(ready, { type: "offerNextQuest" });
  expect(
    offered.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(offered.events),
  ).toBe(false);
  expect(offered.state.dungeon!.nextQuestOffers).toEqual([FACE_THE_THREAT_QUEST_ID]);
  return offered.state;
}

describe("Face the Threat 出征 applyCommand 最小运行时", () => {
  beforeEach(() => {
    ensureNecromancerIBossScriptRegistered();
    ensureProphetIBossScriptRegistered();
  });

  it("countCompletedRegularQuestsAtCampaignLevel：两趟普通任务计 2", () => {
    expect(
      countCompletedRegularQuestsAtCampaignLevel(
        {
          discardedQuests: ["quest:p001", "quest:p003"],
          questSummary: {
            questId: "quest:p002",
            name: "Wipe ‘Em Out I",
            clearedRoomIds: [],
            awarded: true,
            xpPerHero: 2,
            stagecoachXp: 2,
          },
        },
        1,
      ),
    ).toBe(2);
  });

  it("shouldForceFaceTheThreatOfferAtNextQuest：I 级两任务 + 激活威胁为 true", () => {
    const base = hamletJourney(40);
    const game: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        discardedQuests: ["quest:p001", "quest:p003"],
        questSummary: {
          ...base.dungeon!.questSummary!,
          questId: "quest:p002",
          awarded: true,
        },
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      },
    };
    expect(shouldForceFaceTheThreatOfferAtNextQuest(game)).toBe(true);
  });

  it("offerNextQuest：I 级幕末两普通任务后仅提供 quest:p019（不洗牌）", () => {
    const ready = preparationReady(actEndTwoRegularQuestsFixture());
    expect(shouldForceFaceTheThreatOfferAtNextQuest(ready)).toBe(true);
    const cursorBefore = ready.dungeon!.cursor;
    const offered = applyCommand(ready, { type: "offerNextQuest" });
    expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(offered.state.dungeon!.nextQuestOffers).toEqual([FACE_THE_THREAT_QUEST_ID]);
    expect(offered.state.dungeon!.cursor).toBe(cursorBefore);
    expect(offered.events.at(-1)?.message).toMatch(/不消耗 RNG/);
  });

  it("offerNextQuest：仅完成一趟普通任务时仍抽卡", () => {
    const base = hamletJourney(40);
    const ready = preparationReady({
      ...base,
      dungeon: {
        ...base.dungeon!,
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      },
    });
    expect(shouldForceFaceTheThreatOfferAtNextQuest(ready)).toBe(false);
    const offered = applyCommand(ready, { type: "offerNextQuest" });
    expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(offered.state.dungeon!.nextQuestOffers).toHaveLength(2);
    expect(offered.state.dungeon!.nextQuestOffers).not.toContain(FACE_THE_THREAT_QUEST_ID);
  });

  it("chooseNextQuest：钩子 ok 写入 faceTheThreatEmbarkPlan", () => {
    const base = hamletReadyForFaceEmbark();
    const cursorBefore = base.dungeon!.cursor;
    const result = chooseNextQuest(base, base.dungeon!.pending!.id, FACE_THE_THREAT_QUEST_ID);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const plan = readStoredFaceTheThreatEmbarkPlan(result.state.dungeon);
    expect(plan?.resolvedScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(plan?.combatEntry.combatMonsterCardId).toBe(NECROMANCER_I_COMBAT_MONSTER_CARD_ID);
    expect(plan?.layoutWiringHold).toMatch(/R-121/);
    expect(result.state.dungeon!.phase).toBe("awaitingProvisions");
    expect(result.state.dungeon!.cursor).toBeGreaterThan(cursorBefore);
    expect(result.events.at(-1)?.message).toMatch(/Face the Threat→/);
  });

  it("chooseNextQuest：II 级错误威胁拒绝且 cursor 不变；实际 p002 显式场景保留威胁与计划", () => {
    let base = hamletReadyForFaceEmbark();
    base = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        campaignLevel: 2,
        trinkets: { ...base.dungeon!.trinkets!, level: 2 },
        activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
      },
    };
    const cursorBefore = base.dungeon!.cursor;
    const result = chooseNextQuest(base, base.dungeon!.pending!.id, FACE_THE_THREAT_QUEST_ID);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state.dungeon!.cursor).toBe(cursorBefore);
    expect(result.state.dungeon!.phase).toBe("inHamlet");
    ensureNecromancerIIBossScriptRegistered();
    const matched: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
        imminentThreatDescriptionCardId: "boss_ability:p002",
        defeatedRuinsBossIdentities: ["prophet"],
        trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 2),
      },
    };
    const embarked = chooseNextQuest(
      matched,
      matched.dungeon!.pending!.id,
      FACE_THE_THREAT_QUEST_ID,
    );
    expect(embarked.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(embarked.state.dungeon).toMatchObject({
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
      defeatedRuinsBossIdentities: ["prophet"],
      faceTheThreatEmbarkPlan: { resolvedScriptId: NECROMANCER_II_SCRIPT_ID },
    });
    expect(embarked).toEqual(
      chooseNextQuest(matched, matched.dungeon!.pending!.id, FACE_THE_THREAT_QUEST_ID),
    );
  });

  it("resolveFaceTheThreatEmbarkForChoose 与 establishImminentThreat 的 active 威胁一致", () => {
    let game = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources);
    game = ok(game, { type: "establishImminentThreat" });
    const resolved = resolveFaceTheThreatEmbarkForChoose(game, FACE_THE_THREAT_QUEST_ID);
    expect(resolved.kind).toBe("ok");
    if (resolved.kind === "ok") {
      expect(resolved.plan.resolvedScriptId).toBe(game.dungeon!.activeBossThreatScriptId);
    }
  });

  it("沙盒 createCoreDungeonQuest p019 写入 faceTheThreatEmbarkPlan", () => {
    const game = createCoreDungeonQuest(
      3,
      FACE_THE_THREAT_QUEST_ID,
      "radiant",
      coreParty,
      coreQuestSources,
    );
    const plan = readStoredFaceTheThreatEmbarkPlan(game.dungeon);
    expect(plan?.resolvedScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
  });
});
