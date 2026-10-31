import { describe, expect, it } from "vitest";
import {
  bossQuestScriptId,
  faceTheThreatBossScriptByCampaignLevel,
  FACE_THE_THREAT_QUEST_ID,
  isBossQuestId,
  NECROMANCER_I_SCRIPT_ID,
  resolveBossScriptIdForQuest,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
} from "./index";

describe("Boss 任务 → 脚本映射（quest-bridge）", () => {
  it("最暗 Boss 任务映射已注册脚本 id", () => {
    const expected = {
      "quest:p016": DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
      "quest:p017": DARKEST_TEMPLARS_SCRIPT_ID,
      "quest:p018": DARKEST_MAMMOTH_CYST_SCRIPT_ID,
    } as const;
    for (const id of ["quest:p016", "quest:p017", "quest:p018"] as const) {
      expect(isBossQuestId(id)).toBe(true);
      expect(bossQuestScriptId[id]).toBe(expected[id]);
      expect(resolveBossScriptIdForQuest(id)).toBe(expected[id]);
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
