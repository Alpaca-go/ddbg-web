import { describe, expect, it, beforeEach } from "vitest";
import {
  NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
  ensureNecromancerIBossScriptRegistered,
  necromancerIBossScript,
} from "./necromancer-i";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  getBossScript,
  readBossCombatEntry,
  runBossHook,
} from "./index";
import {
  cardIdsPermanentlyRemovedAfterBattle,
  hamletBuildingsBlockedByBossThreat,
} from "./threat-passive";

describe("Necromancer I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureNecromancerIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID);
    expect(script).toBe(necromancerIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: "boss_ability:p001",
      combatAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 1,
      printedActionsPerRound: 1,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
  });

  it("地牢侧威胁：战斗后永久移除非 Unholy 怪物（boss_ability:p004 / R11）", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "afterBattleRemoveNonUnholyMonstersPermanently",
      sourceAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
    });

    const removed = cardIdsPermanentlyRemovedAfterBattle(script, [
      { cardId: "monster_medium:p001", typeTags: ["Human"] },
      { cardId: "monster_medium:p040", typeTags: ["Unholy", "Front"] },
      { cardId: "monster_medium:p089", typeTags: ["Eldritch", "Unholy", "Front"] },
    ]);
    expect(removed).toEqual(["monster_medium:p001"]);
  });

  it("村庄侧威胁：Graveyard is blocked（boss_ability:p004 / R11·R32）", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "graveyardBlocked",
      blockedBuildings: ["graveyard"],
      sourceAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(NECROMANCER_I_SCRIPT_ID, script)).toEqual([
      "graveyard",
    ]);
  });

  it("召唤钩子返回 I 级 Bone Rabble 与 Target Area 放置（R38·R-034）；完整 AI 未接", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID)!;
    const summon = runBossHook(script, "summon", {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      skillSlot: 0,
    });
    expect(summon.status).toBe("ok");
    if (summon.status === "ok") {
      expect(summon.value.summonMonsterCardId).toBe(NECROMANCER_I_SUMMON_MONSTER_CARD_ID);
      expect(summon.value.miniaturePlacement).toBe("targetArea");
    }
  });

  it("Face the Threat 与 Boss 位仍为 stub（归任务卡 / 映射待确认）", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      questId: "quest:p019",
    });
    expect(face.status).toBe("stub");
    if (face.status === "stub") expect(face.hold).toMatch(/待确认|任务卡/);

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("stub");
    if (placement.status === "stub") expect(placement.hold).toMatch(/R-121/);
  });

  it("每回合 1 次行动（卡面 ACTIONS / Round: 1）", () => {
    const script = getBossScript(NECROMANCER_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: NECROMANCER_I_SCRIPT_ID,
      monsterEntityId: "monster:necromancer",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 1 });
  });
});
