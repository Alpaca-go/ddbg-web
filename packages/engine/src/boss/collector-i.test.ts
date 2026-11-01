import { describe, expect, it, beforeEach } from "vitest";
import {
  COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  collectorIBossScript,
  ensureCollectorIBossScriptRegistered,
} from "./collector-i";
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
  skipCurioDrawInCurioRoomsFromBossThreat,
} from "./threat-passive";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";

describe("Collector I Boss 脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCollectorIBossScriptRegistered();
  });

  it("注册后可按 id 取回，并导出核实过的战斗卡引用", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID);
    expect(script).toBe(collectorIBossScript);
    expect(readBossCombatEntry(script)).toEqual({
      descriptionAbilityCardId: COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
      combatAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
      combatMonsterCardId: COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
      printedInitiativeCards: 1,
      printedActionsPerRound: 1,
    });
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
    expect(resolveScriptIdForDescriptionCard(COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID)).toBe(
      COLLECTOR_I_SCRIPT_ID,
    );
  });

  it("地牢侧威胁：Curio 房间不抽 Curio 卡（boss_ability:p016 / Taken Away I）", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "skipCurioDrawInCurioRooms",
      sourceAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(skipCurioDrawInCurioRoomsFromBossThreat(script)).toBe(true);
  });

  it("村庄侧威胁：游商马车封锁（boss_ability:p016 / Missing Artefacts I）", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive).toMatchObject({
      status: "ok",
      effect: "nomadWagonBlocked",
      blockedBuildings: ["nomadWagon"],
      sourceAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
    });
    expect(hamletBuildingsBlockedByBossThreat(COLLECTOR_I_SCRIPT_ID, script)).toEqual([
      "nomadWagon",
    ]);
  });

  it("Face the Threat 通用钩子 ok；Boss 位 R-121 校验 ok（出征 / 洗牌 仍 hold）", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      questId: "quest:p019",
      campaignLevel: 1,
      activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
    });
    expect(face.status).toBe("ok");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("ok");
  });

  it("每回合 1 次行动（卡面 ACTIONS / Round: 1；spec §2.3 先攻 1）", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    const count = defaultMonsterTurnActionCount(script, {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      monsterEntityId: "monster:collector",
      round: 1,
    });
    expect(count).toEqual({ status: "ok", value: 1 });
  });

  it("summon(collectAllPart) 与 collectAll 钩子已声明（运行时见 collector-i-combat-runtime）", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    for (const part of ["manAtArms", "highwayman", "vestal"] as const) {
      const plan = runBossHook(script, "summon", {
        scriptId: COLLECTOR_I_SCRIPT_ID,
        skillSlot: 0,
        purpose: "collectAllPart",
        collectedPart: part,
      });
      expect(plan.status).toBe("ok");
      if (plan.status === "ok") {
        expect(plan.value.miniaturePlacement).toBe("stanceArea");
        expect(plan.value.fixedStance).toBe(
          part === "manAtArms" ? "defensive" : part === "highwayman" ? "ranged" : "support",
        );
      }
    }
    const collectAll = runBossHook(script, "collectAll", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      monsterEntityId: "collector",
      round: 1,
    });
    expect(collectAll).toMatchObject({
      status: "ok",
      effect: "summonThreeCollectedIfNoneInPlayAtTurnStart",
    });
    const skillSummon = runBossHook(script, "summon", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      skillSlot: 1,
      purpose: "skill",
    });
    expect(skillSummon.status).toBe("notApplicable");
  });
});
