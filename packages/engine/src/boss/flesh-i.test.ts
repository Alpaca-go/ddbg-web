import { describe, expect, it, beforeEach } from "vitest";
import {
  FLESH_I_COMBAT_ABILITY_CARD_ID,
  FLESH_I_COMBAT_MONSTER_CARD_ID,
  FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
  FLESH_I_SCRIPT_ID,
  ensureFleshIBossScriptRegistered,
  fleshIBossScript,
} from "./flesh-i";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  getBossScript,
  readBossCombatEntry,
  runBossHook,
} from "./index";
import {
  guardTurnsOnLargeMonsterSpawnFromBossThreat,
  creepingSicknessWoundsPerUnvisitedBuildingFromBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("The Flesh I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFleshIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID);
    expect(script).toBe(fleshIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: FLESH_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 4,
      printedActionsPerRound: 4,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("描述卡映射到 boss:warrens:flesh:1", () => {
    expect(resolveScriptIdForDescriptionCard(FLESH_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      FLESH_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：Large 生成 Guard 2t（Big Troubles I / R11）", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: FLESH_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "guardOnLargeMonsterSpawn",
      guardTurns: 2,
      sourceAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(guardTurnsOnLargeMonsterSpawnFromBossThreat(script)).toBe(2);
  });

  it("村庄侧威胁：Creeping Sickness I 声明每日未访建筑累积伤口", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: FLESH_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "creepingSicknessBuildingWounds",
      woundsPerUnvisitedBuilding: 1,
      sourceAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(creepingSicknessWoundsPerUnvisitedBuildingFromBossThreat(script)).toBe(1);
  });

  it("Face the Threat 通用钩子 ok；Boss 位 R-121 校验 ok（出征 / 洗牌 仍 hold）", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: FLESH_I_SCRIPT_ID,
      questId: "quest:p019",
      campaignLevel: 1,
      activeBossThreatScriptId: FLESH_I_SCRIPT_ID,
    });
    expect(face.status).toBe("ok");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: FLESH_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("ok");
  });

  it("单部位每回合 1 次行动（卡面 One Body / 部位 1 action）", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: FLESH_I_SCRIPT_ID,
      monsterEntityId: "monster:flesh_head",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 1 });
  });

  it("summon(battleStartOneBodyPart) 与 oneBodyMorph 钩子已声明（运行时见 flesh-i-combat-runtime）", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    for (const part of ["head", "bone", "heart", "butt"] as const) {
      const plan = runBossHook(script, "summon", {
        scriptId: FLESH_I_SCRIPT_ID,
        skillSlot: 0,
        purpose: "battleStartOneBodyPart",
        oneBodyPart: part,
      });
      expect(plan.status).toBe("ok");
    }
    const morph = runBossHook(script, "oneBodyMorph", {
      scriptId: FLESH_I_SCRIPT_ID,
      round: 2,
    });
    expect(morph).toMatchObject({
      status: "ok",
      effect: "randomPartCardPerStanceEachRoundStart",
    });
    const skillSummon = runBossHook(script, "summon", {
      scriptId: FLESH_I_SCRIPT_ID,
      skillSlot: 1,
      purpose: "skill",
    });
    expect(skillSummon.status).toBe("stub");
  });
});
