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
import { hamletBuildingsBlockedByBossThreat } from "./threat-passive";
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

  it("地牢侧威胁：Marked for Death 仍为 stub（开战 d10 最低 +2 压力未接线）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveDungeon", {
      scriptId: FANATIC_I_SCRIPT_ID,
      side: "dungeon",
    });
    expect(passive.status).toBe("stub");
    expect(passive).toMatchObject({
      hold: `${FANATIC_I_COMBAT_ABILITY_CARD_ID} / Marked for Death I`,
    });
  });

  it("村庄侧威胁：The Black Sheep 仍为 stub（事件前 d10 最低 +4 压力未接线）", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const passive = runBossHook(script, "threatPassiveHamlet", {
      scriptId: FANATIC_I_SCRIPT_ID,
      side: "hamlet",
    });
    expect(passive.status).toBe("stub");
    expect(hamletBuildingsBlockedByBossThreat(FANATIC_I_SCRIPT_ID, script)).toEqual([]);
  });

  it("Pyre / Sentence Rendered 为 stub；Face the Threat 与 Boss 位仍为 stub", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    expect(runBossHook(script, "summon", { scriptId: FANATIC_I_SCRIPT_ID, skillSlot: 0 }).status).toBe(
      "stub",
    );

    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: FANATIC_I_SCRIPT_ID,
      questId: "quest:p019",
    });
    expect(face.status).toBe("stub");

    const placement = runBossHook(script, "bossSlotPlacement", {
      scriptId: FANATIC_I_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("stub");
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
});
