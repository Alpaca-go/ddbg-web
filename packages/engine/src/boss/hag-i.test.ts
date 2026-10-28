import { describe, expect, it, beforeEach } from "vitest";
import {
  HAG_I_COMBAT_ABILITY_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_SCRIPT_ID,
  ensureHagIBossScriptRegistered,
  hagIBossScript,
} from "./hag-i";
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
  sanitariumHealLifeDeltaFromBossThreat,
  stressOnHeroProvisionUseFromBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("Hag I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureHagIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID);
    expect(script).toBe(hagIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: HAG_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 2,
      printedActionsPerRound: 2,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("描述卡映射到 boss:weald:hag:1", () => {
    expect(resolveScriptIdForDescriptionCard(HAG_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      HAG_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：英雄使用补给药瓶 +1 压力（Painfully Soothing I / R11）", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: HAG_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "stressOnHeroProvisionUse",
      stressDelta: 1,
      sourceAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(stressOnHeroProvisionUseFromBossThreat(script)).toBe(1);
  });

  it("村庄侧威胁：疗养院治疗 Life −3（No Rest for the Wicked I / R11·R32）", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: HAG_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "sanitariumHealLifeDelta",
      healDelta: -3,
      sourceAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(HAG_I_SCRIPT_ID, script)).toEqual([]);
    expect(sanitariumHealLifeDeltaFromBossThreat(script)).toBe(-3);
  });

  it("召唤与 Cauldron 为 stub；Face the Threat 与 Boss 位仍为 stub", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const summon = runBossHook(script, "summon", {
      scriptId: HAG_I_SCRIPT_ID,
      skillSlot: 0,
    });
    expect(summon.status).toBe("stub");

    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: HAG_I_SCRIPT_ID,
      questId: "quest:p019",
    });
    expect(face.status).toBe("stub");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: HAG_I_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("stub");
  });

  it("每回合 2 次行动（卡面 ACTIONS / Round: 2）", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: HAG_I_SCRIPT_ID,
      monsterEntityId: "monster:hag",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 2 });
  });
});
