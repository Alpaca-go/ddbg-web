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
import {
  bossQuestScriptId,
  FACE_THE_THREAT_QUEST_ID,
  resolveBossScriptIdForQuest,
} from "./quest-bridge";

describe("C-019 · Necromancer II 显式战斗脚本", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCoreBossScriptsRegistered();
  });

  it("两项威胁完成后，正式注册死灵法师 II；III 已注册，缺实际威胁仍停点", () => {
    expect(getBossScript(NECROMANCER_II_SCRIPT_ID)).toBe(necromancerIIBossScript);
    expect(resolveScriptIdForDescriptionCard("boss_ability:p002")).toBe(NECROMANCER_II_SCRIPT_ID);
    expect(resolveScriptIdForDescriptionCard("boss_ability:p003")).toBe("boss:ruins:necromancer:3");
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
    expect(
      runBossHook(necromancerIIBossScript, "threatPassiveDungeon", {
        scriptId: NECROMANCER_II_SCRIPT_ID,
        side: "dungeon",
      }),
    ).toMatchObject({
      status: "ok",
      effect: "firstBattleBoneCaptain",
      monsterCardId: "monster_large:p001",
    });
    expect(
      runBossHook(necromancerIIBossScript, "threatPassiveHamlet", {
        scriptId: NECROMANCER_II_SCRIPT_ID,
        side: "hamlet",
      }),
    ).toMatchObject({
      status: "ok",
      effect: "firstDayGraveyardGuard",
      sourceAbilityCardId: "boss_ability:p005",
    });
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
  it("R-124：仅 II 级实际 p002 + 已注册死灵法师 II 可解析出征钩子", () => {
    ensureNecromancerIIBossScriptRegistered();
    const context = {
      campaignLevel: 2,
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
    } as const;
    const result = runFaceTheThreatEmbarkForQuest({
      ...context,
      questId: FACE_THE_THREAT_QUEST_ID,
    });
    expect(result).toMatchObject({
      status: "ok",
      value: { resolvedScriptId: NECROMANCER_II_SCRIPT_ID },
    });
    for (const invalid of [
      { ...context, campaignLevel: 1 as const },
      { ...context, campaignLevel: 3 as const },
      { ...context, activeBossThreatScriptId: "boss:ruins:prophet:2" as const },
      { ...context, imminentThreatDescriptionCardId: "boss_ability:p008" },
      { campaignLevel: 2 as const, activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID },
      { campaignLevel: 2 as const, imminentThreatDescriptionCardId: "boss_ability:p002" },
      { campaignLevel: 2 as const },
    ])
      expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, invalid)).toBeUndefined();
    const previous = bossQuestScriptId[FACE_THE_THREAT_QUEST_ID];
    try {
      bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = NECROMANCER_II_SCRIPT_ID;
      expect(
        resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, { campaignLevel: 2 }),
      ).toBeUndefined();
    } finally {
      if (previous) bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = previous;
      else delete bossQuestScriptId[FACE_THE_THREAT_QUEST_ID];
    }
  });
});
