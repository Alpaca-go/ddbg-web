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
import { guardTurnsOnLargeMonsterSpawnFromBossThreat } from "./threat-passive";
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

  it("村庄侧威胁：Creeping Sickness I 仍为 stub", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: FLESH_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive.status).toBe("stub");
  });

  it("One Body / morph 为 stub；Face the Threat 与 Boss 位仍为 stub", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    expect(runBossHook(script, "summon", { scriptId: FLESH_I_SCRIPT_ID, skillSlot: 0 }).status).toBe(
      "stub",
    );
    expect(
      runBossHook(script, "faceTheThreatEmbark", {
        scriptId: FLESH_I_SCRIPT_ID,
        questId: "quest:p019",
      }).status,
    ).toBe("stub");
    expect(
      runBossHook(script, "bossSlotPlacement", {
        scriptId: FLESH_I_SCRIPT_ID,
        layoutId: "layout:fixture",
        bossSlotNodeIds: ["A", "B", "G"],
      }).status,
    ).toBe("stub");
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
});
