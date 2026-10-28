import { describe, expect, it, beforeEach } from "vitest";
import {
  SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  ensureSwinePrinceIBossScriptRegistered,
  swinePrinceIBossScript,
} from "./swine-prince-i";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  getBossScript,
  readBossCombatEntry,
  runBossHook,
} from "./index";
import {
  beastMonsterDamageBonusFromBossThreat,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("Swine Prince I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureSwinePrinceIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID);
    expect(script).toBe(swinePrinceIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 2,
      printedActionsPerRound: 2,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("描述卡映射到 boss:warrens:swine_prince:1", () => {
    expect(resolveScriptIdForDescriptionCard(SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      SWINE_PRINCE_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：Beast 怪物伤害 +2（Uneasy Times I / R11）", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "beastMonsterDamageBonus",
      damageDelta: 2,
      sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(beastMonsterDamageBonusFromBossThreat(script)).toBe(2);
  });

  it("村庄侧威胁：生存专家封锁（Bestial Rage / R11·R32）", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "survivalistBlocked",
      blockedBuildings: ["survivalist"],
      sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(SWINE_PRINCE_I_SCRIPT_ID, script)).toEqual([
      "survivalist",
    ]);
  });

  it("Wilbur 伴战为 stub；Face the Threat 与 Boss 位仍为 stub", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    const summon = runBossHook(script, "summon", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      skillSlot: 0,
    });
    expect(summon.status).toBe("stub");

    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      questId: "quest:p019",
    });
    expect(face.status).toBe("stub");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("stub");
  });

  it("每回合 2 次行动（卡面 ACTIONS / Round: 2）", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      monsterEntityId: "monster:swine_prince",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 2 });
  });
});
