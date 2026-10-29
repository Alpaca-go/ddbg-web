import { describe, expect, it, beforeEach } from "vitest";
import {
  PROPHET_I_COMBAT_ABILITY_CARD_ID,
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  ensureProphetIBossScriptRegistered,
  prophetIBossScript,
} from "./prophet-i";
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
  stressOnDungeonEntryPerHeroFromBossThreat,
  tavernStressRecoveryDeltaFromBossThreat,
} from "./threat-passive";

describe("Prophet I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID);
    expect(script).toBe(prophetIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: "boss_ability:p007",
      combatAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: PROPHET_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 3,
      printedActionsPerRound: 3,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("地牢侧威胁：进地牢每名英雄 +2 压力（boss_ability:p010 / R11）", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: PROPHET_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "stressOnDungeonEntryPerHero",
      stressDelta: 2,
      sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(stressOnDungeonEntryPerHeroFromBossThreat(script)).toBe(2);
  });

  it("村庄侧威胁：酒馆减压有效恢复 −1（boss_ability:p010 / R11·R32）", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: PROPHET_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "tavernStressRecoveryDelta",
      recoveryDelta: -1,
      sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(PROPHET_I_SCRIPT_ID, script)).toEqual([]);
    expect(tavernStressRecoveryDeltaFromBossThreat(script)).toBe(-1);
  });

  it("Face the Threat 通用钩子 ok；Boss 位 R-121 校验 ok（出征 / 洗牌 仍 hold）", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: PROPHET_I_SCRIPT_ID,
      questId: "quest:p019",
      campaignLevel: 1,
      activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
    });
    expect(face.status).toBe("ok");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: PROPHET_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("ok");
  });

  it("每回合 3 次行动（卡面 ACTIONS / Round: 3；R38 先攻 3）", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: PROPHET_I_SCRIPT_ID,
      monsterEntityId: "monster:prophet",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 3 });
  });

  it("summon(calamitousWoodenPew) 与 calamitousPrognostication 钩子已声明（运行时见 prophet-i-combat-runtime）", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const calamitous = runBossHook(script, "calamitousPrognostication", {
      scriptId: PROPHET_I_SCRIPT_ID,
      monsterEntityId: "prophet",
      round: 1,
    });
    expect(calamitous).toMatchObject({
      status: "ok",
      effect: "rollFourD10PlaceWoodenPewsOnFirstActionEachRound",
      pewCount: 4,
    });
    for (const pewIndex of [0, 1, 2, 3] as const) {
      const plan = runBossHook(script, "summon", {
        scriptId: PROPHET_I_SCRIPT_ID,
        skillSlot: 0,
        purpose: "calamitousWoodenPew",
        woodenPewIndex: pewIndex,
      });
      expect(plan.status).toBe("ok");
      if (plan.status === "ok") {
        expect(plan.value.miniaturePlacement).toBe("areaD10Marker");
        expect(plan.value.woodenPewIndex).toBe(pewIndex);
      }
    }
    const skillSummon = runBossHook(script, "summon", {
      scriptId: PROPHET_I_SCRIPT_ID,
      skillSlot: 2,
      purpose: "skill",
    });
    expect(skillSummon.status).toBe("stub");
  });
});
