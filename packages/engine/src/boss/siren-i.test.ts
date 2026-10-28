import { describe, expect, it, beforeEach } from "vitest";
import {
  SIREN_I_COMBAT_ABILITY_CARD_ID,
  SIREN_I_COMBAT_MONSTER_CARD_ID,
  SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
  SIREN_I_SCRIPT_ID,
  ensureSirenIBossScriptRegistered,
  sirenIBossScript,
} from "./siren-i";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  getBossScript,
  readBossCombatEntry,
  runBossHook,
} from "./index";
import {
  eldritchMonsterDamageBonusFromBossThreat,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("Siren I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureSirenIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID);
    expect(script).toBe(sirenIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: SIREN_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 2,
      printedActionsPerRound: 2,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("描述卡映射到 boss:cove:siren:1", () => {
    expect(resolveScriptIdForDescriptionCard(SIREN_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      SIREN_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：Eldritch 怪物伤害 +2（Distressing Times I / R11）", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: SIREN_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "eldritchMonsterDamageBonus",
      damageDelta: 2,
      sourceAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(eldritchMonsterDamageBonusFromBossThreat(script)).toBe(2);
  });

  it("村庄侧威胁：修道院封锁（Captivating Call I / R11·R32）", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: SIREN_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "abbeyBlocked",
      blockedBuildings: ["abbey"],
      sourceAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(SIREN_I_SCRIPT_ID, script)).toEqual(["abbey"]);
  });

  it("Face the Threat 通用钩子 ok；Boss 位 R-121 校验 ok（出征 / 洗牌 仍 hold）", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: SIREN_I_SCRIPT_ID,
      questId: "quest:p019",
      campaignLevel: 1,
      activeBossThreatScriptId: SIREN_I_SCRIPT_ID,
    });
    expect(face.status).toBe("ok");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: SIREN_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("ok");
  });

  it("每回合 2 次行动（卡面 ACTIONS / Round: 2）", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: SIREN_I_SCRIPT_ID,
      monsterEntityId: "monster:siren",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 2 });
  });
});
