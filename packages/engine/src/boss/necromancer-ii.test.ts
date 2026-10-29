import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureNecromancerIIBossScriptRegistered,
  necromancerIIBossScript,
  NECROMANCER_II_SCRIPT_ID,
} from "./necromancer-ii";
import { clearBossScriptsForTest, getBossScript } from "./registry";
import { ensureCoreBossScriptsRegistered } from "./ensure-core-boss-scripts";
import { runBossHook } from "./hooks";
import { resolveScriptIdForDescriptionCard } from "./threat-description-catalog";
import { runFaceTheThreatEmbarkForQuest } from "./face-the-threat-hooks";

describe("C-019 · Necromancer II 显式战斗脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCoreBossScriptsRegistered();
  });

  it("两项威胁未接前，正式池不自动注册或激活 II；III 同样未开放", () => {
    expect(getBossScript(NECROMANCER_II_SCRIPT_ID)).toBeUndefined();
    expect(resolveScriptIdForDescriptionCard("boss_ability:p002")).toBeUndefined();
    expect(resolveScriptIdForDescriptionCard("boss_ability:p003")).toBeUndefined();
    expect(runFaceTheThreatEmbarkForQuest({ questId: "quest:p019", campaignLevel: 2 }).status).toBe(
      "stub",
    );
  });

  it("显式注册幂等，引用独立核实的 II 卡和 Bone Soldier；不继承 I 的被动", () => {
    ensureNecromancerIIBossScriptRegistered();
    ensureNecromancerIIBossScriptRegistered();
    expect(getBossScript(NECROMANCER_II_SCRIPT_ID)).toBe(necromancerIIBossScript);
    expect(necromancerIIBossScript.combatEntry).toEqual({
      descriptionAbilityCardId: "boss_ability:p002",
      combatAbilityCardId: "boss_ability:p005",
      combatMonsterCardId: "monster_medium:p090",
      printedInitiativeCards: 1,
      printedActionsPerRound: 1,
    });
    for (const side of ["dungeon", "hamlet"] as const) {
      const result = runBossHook(
        necromancerIIBossScript,
        side === "dungeon" ? "threatPassiveDungeon" : "threatPassiveHamlet",
        { scriptId: NECROMANCER_II_SCRIPT_ID, side },
      );
      expect(result).toMatchObject({ status: "stub", hold: "C-019 / boss_ability:p005" });
    }
    expect(
      runBossHook(necromancerIIBossScript, "summon", {
        scriptId: NECROMANCER_II_SCRIPT_ID,
        purpose: "skill",
        skillSlot: 3,
      }),
    ).toMatchObject({
      status: "ok",
      value: { summonMonsterCardId: "monster_medium:p001", miniaturePlacement: "targetArea" },
    });
  });
});
