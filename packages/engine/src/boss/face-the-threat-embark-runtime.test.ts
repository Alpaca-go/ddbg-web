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
  resolveFaceTheThreatOfferAtNextQuest,
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

/** 明示 II 级幕末机制夹具；不表示自然升幕或两个 II 级任务已试玩完成。 */
function iiActEndFixture(): GameState {
  const base = preparationReady(actEndTwoRegularQuestsFixture());
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      campaignLevel: 2,
      discardedQuests: [
        "quest:p001",
        "quest:p002",
        "quest:p003",
        "quest:p004",
        "quest:p005",
        "quest:p006",
        "quest:p008",
      ],
      questSummary: { ...base.dungeon!.questSummary!, questId: "quest:p007" },
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
      defeatedRuinsBossIdentities: ["prophet"],
      trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 2),
    },
  };
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
        necromancerIIArmyUsed: true,
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
    expect(embarked.state.dungeon!.necromancerIIArmyUsed).toBeUndefined();
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

describe("R-126：II 级死灵法师幕末 offer 限定切片", () => {
  it("只计算本幕普通任务；旧级弃置和 Boss 摘要不增加 II 级任务数", () => {
    const d = iiActEndFixture().dungeon!;
    expect(countCompletedRegularQuestsAtCampaignLevel(d, 2)).toBe(2);
    expect(
      countCompletedRegularQuestsAtCampaignLevel(
        { ...d, discardedQuests: d.discardedQuests!.slice(0, 5) },
        2,
      ),
    ).toBe(1);
    expect(
      countCompletedRegularQuestsAtCampaignLevel(
        {
          ...d,
          discardedQuests: d.discardedQuests!.slice(0, 5),
          questSummary: { ...d.questSummary!, questId: FACE_THE_THREAT_QUEST_ID },
        },
        2,
      ),
    ).toBe(0);
  });

  it("两任务 + 实际 p002 只提供 p019；无 RNG、输入不变、JSON 续接一致", () => {
    const base = iiActEndFixture();
    const snapshot = JSON.stringify(base);
    expect(shouldForceFaceTheThreatOfferAtNextQuest(base)).toBe(true);
    const offered = applyCommand(base, { type: "offerNextQuest" });
    expect(offered.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(offered.state.dungeon!.nextQuestOffers).toEqual([FACE_THE_THREAT_QUEST_ID]);
    expect(offered.pendingChoice?.options.map((o) => o.id)).toEqual([FACE_THE_THREAT_QUEST_ID]);
    expect(offered.state.dungeon!.cursor).toBe(base.dungeon!.cursor);
    expect(offered.state.dungeon!.decision).toBe(base.dungeon!.decision + 1);
    expect(JSON.stringify(base)).toBe(snapshot);
    expect(offered).toEqual(applyCommand(JSON.parse(snapshot), { type: "offerNextQuest" }));

    const command: Command = {
      type: "resolveChoice",
      choiceId: offered.pendingChoice!.id,
      optionId: FACE_THE_THREAT_QUEST_ID,
    };
    const embarked = applyCommand(offered.state, command);
    expect(embarked.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(embarked.state.dungeon).toMatchObject({
      phase: "awaitingProvisions",
      campaignLevel: 2,
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
      defeatedRuinsBossIdentities: ["prophet"],
      faceTheThreatEmbarkPlan: { resolvedScriptId: NECROMANCER_II_SCRIPT_ID },
    });
    expect(readStoredFaceTheThreatEmbarkPlan(embarked.state.dungeon)?.layoutWiringHold).toMatch(
      /R-121/,
    );
    expect(embarked).toEqual(applyCommand(JSON.parse(JSON.stringify(offered.state)), command));
    const repeated = applyCommand(embarked.state, command);
    expect(repeated.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(repeated.state).toBe(embarked.state);

    for (const invalid of [
      { type: "offerNextQuest" },
      { ...command, optionId: "quest:p009" },
      { ...command, choiceId: "hamlet-next-quest:expired" },
    ] as const) {
      const refused = applyCommand(offered.state, invalid);
      expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
      expect(refused.state).toBe(offered.state);
    }
    const changedThreat: GameState = {
      ...offered.state,
      dungeon: { ...offered.state.dungeon!, activeBossThreatScriptId: PROPHET_I_SCRIPT_ID },
    };
    const mismatched = applyCommand(changedThreat, command);
    expect(mismatched.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(mismatched.state).toBe(changedThreat);
  });

  it("幕末夹具从公开升幕抽牌衔接：p002 激活后可 offer，其它真实抽牌保留停点", () => {
    const fixture = iiActEndFixture();
    const {
      activeBossThreatScriptId: _active,
      imminentThreatDescriptionCardId: _card,
      ...d
    } = fixture.dungeon!;
    void _active;
    void _card;
    const descriptions = new Set<string>();
    // 明示机制夹具逐种子抽牌；不代表自然 I→II 战役日志或正式存档。
    for (let seed = 0; seed < 12; seed++) {
      const base: GameState = { ...fixture, seed, dungeon: d };
      const drawn = applyCommand(base, { type: "drawImminentThreatAfterActAdvance" });
      expect(drawn.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      const threat = drawn.state.dungeon!;
      descriptions.add(threat.imminentThreatDescriptionCardId!);
      const offered = applyCommand(drawn.state, { type: "offerNextQuest" });
      if (threat.imminentThreatDescriptionCardId === "boss_ability:p002") {
        expect(threat.activeBossThreatScriptId).toBe(NECROMANCER_II_SCRIPT_ID);
        expect(offered.events.filter((e) => e.type === "commandRefused")).toEqual([]);
        expect(offered.state.dungeon!.nextQuestOffers).toEqual([FACE_THE_THREAT_QUEST_ID]);
        expect(offered.state.dungeon!.cursor).toBe(threat.cursor);
      } else {
        expect(threat.unregisteredImminentThreatHold).toBeTruthy();
        expect(offered.events.some((e) => e.type === "commandRefused")).toBe(true);
        expect(offered.state).toBe(drawn.state);
      }
    }
    expect(descriptions.has("boss_ability:p002")).toBe(true);
    expect(descriptions.size).toBe(3);
  });

  it.each([
    [undefined, "boss_ability:p002"],
    [NECROMANCER_II_SCRIPT_ID, undefined],
    [NECROMANCER_II_SCRIPT_ID, "boss_ability:p008"],
    [NECROMANCER_II_SCRIPT_ID, "boss_ability:p001"],
    [PROPHET_I_SCRIPT_ID, "boss_ability:p002"],
    ["boss:ruins:prophet:2", "boss_ability:p008"],
  ] as const)("幕末威胁 %s / %s 无法匹配时原子拒绝，不抽普通任务", (active, description) => {
    const fixture = iiActEndFixture();
    const {
      activeBossThreatScriptId: _active,
      imminentThreatDescriptionCardId: _card,
      ...d
    } = fixture.dungeon!;
    void _active;
    void _card;
    const base: GameState = {
      ...fixture,
      dungeon: {
        ...d,
        ...(active ? { activeBossThreatScriptId: active } : {}),
        ...(description ? { imminentThreatDescriptionCardId: description } : {}),
      },
    };
    expect(resolveFaceTheThreatOfferAtNextQuest(base).kind).toBe("refused");
    expect(shouldForceFaceTheThreatOfferAtNextQuest(base)).toBe(false);
    const result = applyCommand(base, { type: "offerNextQuest" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.events.at(-1)?.message).toMatch(/R-124/);
    expect(result.state).toBe(base);
    expect(result.pendingChoice).toBeUndefined();
  });

  it("II 级只完成一任务时继续普通抽卡，未发放摘要不触发幕末", () => {
    const fixture = iiActEndFixture();
    const oneQuest: GameState = {
      ...fixture,
      dungeon: {
        ...fixture.dungeon!,
        discardedQuests: fixture.dungeon!.discardedQuests!.slice(0, 5),
      },
    };
    expect(shouldForceFaceTheThreatOfferAtNextQuest(oneQuest)).toBe(false);
    const offered = applyCommand(oneQuest, { type: "offerNextQuest" });
    expect(offered.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(offered.state.dungeon!.nextQuestOffers).toHaveLength(2);
    expect(offered.state.dungeon!.nextQuestOffers).not.toContain(FACE_THE_THREAT_QUEST_ID);
    const unawarded: GameState = {
      ...fixture,
      dungeon: {
        ...fixture.dungeon!,
        questSummary: { ...fixture.dungeon!.questSummary!, awarded: false },
      },
    };
    expect(resolveFaceTheThreatOfferAtNextQuest(unawarded).kind).toBe("notApplicable");
    expect(applyCommand(unawarded, { type: "offerNextQuest" }).state).toBe(unawarded);
  });

  it("III 级不新增强制 offer 或 Boss 映射", () => {
    const fixture = iiActEndFixture();
    const levelThree: GameState = {
      ...fixture,
      dungeon: {
        ...fixture.dungeon!,
        campaignLevel: 3,
        discardedQuests: ["quest:p011", "quest:p013"],
        questSummary: { ...fixture.dungeon!.questSummary!, questId: "quest:p012" },
      },
    };
    expect(countCompletedRegularQuestsAtCampaignLevel(levelThree.dungeon!, 3)).toBe(2);
    expect(resolveFaceTheThreatOfferAtNextQuest(levelThree).kind).toBe("notApplicable");
    expect(shouldForceFaceTheThreatOfferAtNextQuest(levelThree)).toBe(false);
    expect(resolveFaceTheThreatEmbarkForChoose(levelThree, FACE_THE_THREAT_QUEST_ID).kind).toBe(
      "refused",
    );
  });
});
