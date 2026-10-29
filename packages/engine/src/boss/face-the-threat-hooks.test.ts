import { describe, expect, it, beforeEach } from "vitest";
import {
  COLLECTOR_I_SCRIPT_ID,
  FACE_THE_THREAT_QUEST_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  PROPHET_I_SCRIPT_ID,
  clearBossScriptsForTest,
  ensureCoreBossScriptsRegistered,
  getBossScript,
  runBossHook,
  runBossSlotPlacementForScript,
  runFaceTheThreatEmbarkForQuest,
  defaultFaceTheThreatEmbarkHook,
  defaultBossSlotPlacementHook,
  R121_BOSS_SLOTS_QUEST_MAP_P011,
  R121_BOSS_SLOTS_QUEST_MAP_P012,
  canonicalBossSlotNodeIdsForLayout,
} from "./index";

describe("Face the Threat 通用钩子", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCoreBossScriptsRegistered();
  });

  it("runFaceTheThreatEmbarkForQuest：activeBossThreatScriptId 优先并返回 combatEntry", () => {
    const result = runFaceTheThreatEmbarkForQuest({
      questId: FACE_THE_THREAT_QUEST_ID,
      campaignLevel: 1,
      activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.resolvedScriptId).toBe(PROPHET_I_SCRIPT_ID);
      expect(result.value.combatEntry.combatMonsterCardId).toBeTruthy();
      expect(result.value.wiringHold).toMatch(/R-121/);
      expect(result.value.rulesRef).toContain("spec:§14.1");
    }
  });

  it("缺省威胁 + CL I 仍解析 Necromancer I（quest-bridge 沙盒）", () => {
    const result = runFaceTheThreatEmbarkForQuest({
      questId: FACE_THE_THREAT_QUEST_ID,
      campaignLevel: 1,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.resolvedScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
      expect(result.value.combatEntry.combatMonsterCardId).toBe(
        NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
      );
    }
  });

  it("CL II 无 active 威胁且无等级映射时 stub（II/III 待确认）", () => {
    const result = runFaceTheThreatEmbarkForQuest({
      questId: FACE_THE_THREAT_QUEST_ID,
      campaignLevel: 2,
    });
    expect(result.status).toBe("stub");
    if (result.status === "stub") {
      expect(result.hold).toMatch(/II\/III/);
    }
  });

  it("钩子 scriptId 与 resolve 不一致时 stub", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    const face = runBossHook(script, "faceTheThreatEmbark", {
      scriptId: PROPHET_I_SCRIPT_ID,
      questId: FACE_THE_THREAT_QUEST_ID,
      campaignLevel: 1,
    });
    expect(face.status).toBe("stub");
    if (face.status === "stub") {
      expect(face.hold).toMatch(/activeBossThreatScriptId/);
    }
  });

  it("defaultFaceTheThreatEmbarkHook：匹配 active 威胁时 ok", () => {
    const ok = defaultFaceTheThreatEmbarkHook({
      scriptId: COLLECTOR_I_SCRIPT_ID,
      questId: FACE_THE_THREAT_QUEST_ID,
      campaignLevel: 1,
      activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
    });
    expect(ok.status).toBe("ok");
  });

  it("R-121：p011/p012 Boss 位节点校验 ok；非法 layout stub", () => {
    const p11 = defaultBossSlotPlacementHook({
      scriptId: NECROMANCER_I_SCRIPT_ID,
      layoutId: "quest_map:p011",
      bossSlotNodeIds: [...R121_BOSS_SLOTS_QUEST_MAP_P011],
    });
    expect(p11.status).toBe("ok");
    if (p11.status === "ok") {
      expect(p11.value.placementAlgorithm).toBe("objectivePlusTwoRandomNonObjective");
      expect(p11.value.wiringHold).toMatch(/洗入三格/);
    }

    const p12 = runBossSlotPlacementForScript(NECROMANCER_I_SCRIPT_ID, {
      layoutId: "quest_map:p012",
      bossSlotNodeIds: [...R121_BOSS_SLOTS_QUEST_MAP_P012],
    });
    expect(p12.status).toBe("ok");

    const badLayout = defaultBossSlotPlacementHook({
      scriptId: NECROMANCER_I_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(badLayout.status).toBe("stub");
    if (badLayout.status === "stub") expect(badLayout.hold).toMatch(/R-121/);

    expect(canonicalBossSlotNodeIdsForLayout("quest_map:p011")).toEqual(["A", "B", "G"]);
  });
});
