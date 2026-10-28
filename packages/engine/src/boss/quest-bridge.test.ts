import { describe, expect, it } from "vitest";
import {
  bossQuestScriptId,
  faceTheThreatBossScriptByCampaignLevel,
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  NECROMANCER_I_SCRIPT_ID,
  resolveBossScriptIdForQuest,
} from "./index";

describe("Boss 任务 → 脚本映射（quest-bridge）", () => {
  it("最暗 Boss 任务在脚本未落地前不编造 script id", () => {
    for (const id of ["quest:p016", "quest:p017", "quest:p018"] as const) {
      expect(isBossQuestId(id)).toBe(true);
      expect(bossQuestScriptId[id]).toBeUndefined();
      expect(resolveBossScriptIdForQuest(id)).toBeUndefined();
    }
  });

  it("Face the Threat：战役 I 级映射 Necromancer I；II/III 待脚本", () => {
    expect(faceTheThreatBossScriptByCampaignLevel[1]).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(faceTheThreatBossScriptByCampaignLevel[2]).toBeUndefined();
    expect(faceTheThreatBossScriptByCampaignLevel[3]).toBeUndefined();

    expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID)).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, { campaignLevel: 1 })).toBe(
      NECROMANCER_I_SCRIPT_ID,
    );
    expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, { campaignLevel: 2 })).toBe(
      undefined,
    );
  });

  it("Face the Threat：有 activeBossThreatScriptId 时优先于缺省 Necromancer I", () => {
    expect(
      resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, {
        campaignLevel: 1,
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      }),
    ).toBe(NECROMANCER_I_SCRIPT_ID);
  });

  it("静态表条目优先于 Face the Threat 等级表", () => {
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] =
      "boss:fixture:override" as typeof NECROMANCER_I_SCRIPT_ID;
    expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, { campaignLevel: 1 })).toBe(
      "boss:fixture:override",
    );
    delete bossQuestScriptId[FACE_THE_THREAT_QUEST_ID];
  });
});
