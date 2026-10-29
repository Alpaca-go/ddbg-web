import { describe, expect, it, beforeEach } from "vitest";
import {
  FANATIC_I_COMBAT_ABILITY_CARD_ID,
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  ensureFanaticIBossScriptRegistered,
  fanaticIBossScript,
} from "./fanatic-i";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  getBossScript,
  readBossCombatEntry,
  runBossHook,
} from "./index";
import {
  hamletBuildingsBlockedByBossThreat,
  blackSheepStressDeltaFromBossThreat,
  markTurnsOnBattleStartFromBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("Fanatic I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFanaticIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID);
    expect(script).toBe(fanaticIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: FANATIC_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 4,
      printedActionsPerRound: 3,
    });
    expect(FANATIC_I_PYRE_MONSTER_CARD_ID).toBe("monster_large:p011");
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
    expect(resolveScriptIdForDescriptionCard(FANATIC_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      FANATIC_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：Marked for Death 开战 d10 最低者 Mark 2t（图标 192ea1fea9）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: FANATIC_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "markOnBattleStartLowestD10",
      markTurns: 2,
      sourceAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(markTurnsOnBattleStartFromBossThreat(script)).toBe(2);
  });

  it("村庄侧威胁：The Black Sheep 声明事件前 d10 最低 +4 压力", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: FANATIC_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "blackSheepBeforeHamletEvent",
      stressDelta: 4,
      sourceAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(blackSheepStressDeltaFromBossThreat(script)).toBe(4);
    expect(hamletBuildingsBlockedByBossThreat(FANATIC_I_SCRIPT_ID, script)).toEqual([]);
  });

  it("Face the Threat 通用钩子 ok；Boss 位 R-121 校验 ok（出征 / 洗牌 仍 hold）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: FANATIC_I_SCRIPT_ID,
      questId: "quest:p019",
      campaignLevel: 1,
      activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
    });
    expect(face.status).toBe("ok");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: FANATIC_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("ok");
  });

  it("每回合 3 次行动（卡面 ACTIONS / Round: 3；spec §14.5 先攻 4 含 Pyre）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: FANATIC_I_SCRIPT_ID,
      monsterEntityId: "monster:fanatic",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 3 });
  });

  it("summon(battleStartPyre) 与 sentenceRendered 钩子已声明（运行时见 fanatic-i-combat-runtime）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const pyre = runBossHook(script, "summon", {
      scriptId: FANATIC_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "battleStartPyre",
    });
    expect(pyre).toMatchObject({
      status: "ok",
      value: {
        summonMonsterCardId: FANATIC_I_PYRE_MONSTER_CARD_ID,
        fixedStance: "ranged",
      },
    });
    const sentence = runBossHook(script, "sentenceRendered", {
      scriptId: FANATIC_I_SCRIPT_ID,
      monsterEntityId: "fanatic",
      round: 1,
    });
    expect(sentence).toMatchObject({
      status: "ok",
      effect: "moveTowardClosestHeroOrTossIntoPyreArea",
    });
  });
});
