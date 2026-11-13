import { describe, expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curio from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import {
  questsForCampaignLevel,
  questsForContentPacks,
  sandboxEmbarkQuestsForPacks,
} from "../../data/src/basic-quests";
import {
  pickEmbarkQuestMapLayout,
  sandboxExpeditionEmbarkBlockReason,
} from "../../data/src/quest-map-pairing";
import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { recoverHamletPools } from "./hamlet-return-pools";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";

const wealdSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curio).cards },
};
const packs = ["core", "weald"] as const;

describe("Purge the Woods 沙盒出征（步骤 5 第七批，R-248）", () => {
  it("未选 Weald 包时沙盒列表与创建均不可用", () => {
    expect(sandboxEmbarkQuestsForPacks(["core"]).map((q) => q.id)).not.toContain(
      "quest:weald:p004",
    );
    expect(() =>
      createCoreDungeonQuest(
        3,
        "quest:weald:p004",
        "radiant",
        coreParty,
        wealdSources,
        true,
        "full",
        ["core"],
      ),
    ).toThrow(/尚未开放/);
  });

  it("选了包可读沙盒任务，村庄 I 级池仍不含 Weald", () => {
    const sandboxIds = sandboxEmbarkQuestsForPacks([...packs]).map((q) => q.id);
    expect(sandboxIds).toContain("quest:weald:p004");
    expect(sandboxIds).toContain("quest:weald:p005");
    expect(questsForContentPacks(1, [...packs]).map((q) => q.id)).not.toContain("quest:weald:p004");
    expect(questsForCampaignLevel(1).map((q) => q.id)).not.toContain("quest:weald:p004");
    expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p004", [...packs])).toBeNull();
  });

  it("createCoreDungeonQuest 写入 R-248 当地-only 可抽实例（14 张，无通用）", () => {
    const game = createCoreDungeonQuest(
      19,
      "quest:weald:p004",
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    expect(d.questDistribution?.questId).toBe("quest:weald:p004");
    expect(d.monsterPool?.monsterDrawScope).toBe("wealdLocalOnly");
    const through = dungeonMonsterPoolThrough(d.monsterPool!, 1);
    expect(through).toHaveLength(14);
    expect(through.every((c) => c.instanceId.startsWith("monster-deck:weald:"))).toBe(true);
    expect(through.some((c) => /^monster-deck:p\d+$/.test(c.instanceId))).toBe(false);
    const expectedLayout = pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === "quest:weald:p004")!),
      19,
      0,
    );
    expect(d.layout.id).toBe(expectedLayout.id);
    expect(d.layout.review).toBe("confirmed");
    const commonInCatalog = d.battleCatalog!.monsters.filter((m) =>
      m.id.startsWith("monster_medium:p"),
    );
    expect(commonInCatalog.length).toBeGreaterThan(0);
  });

  it("清巢穴 XP：0/1/2/3 巢穴对应 0/1/2/3 XP（R-038）", () => {
    const base = createCoreDungeonQuest(
      41,
      "quest:weald:p004",
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const cleared = (count: number): GameState => {
      let lairsSeen = 0;
      return {
        ...base,
        dungeon: {
          ...base.dungeon!,
          phase: "exited",
          rooms: base.dungeon!.rooms.map((r) => {
            if (r.kind !== "lair") return { ...r, revealed: true, cleared: false };
            const isCleared = lairsSeen < count;
            lairsSeen += 1;
            return { ...r, revealed: true, cleared: isCleared };
          }),
        },
      };
    };
    for (const count of [0, 1, 2, 3]) {
      const result = applyCommand(cleared(count), { type: "summarizeDungeonQuest" });
      expect(result.state.dungeon!.questSummary).toMatchObject({
        questId: "quest:weald:p004",
        xpPerHero: count,
        stagecoachXp: count,
      });
    }
  });

  it("回村前怪物牌池守恒（14 张当地实体）", () => {
    const game = createCoreDungeonQuest(
      19,
      "quest:weald:p004",
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    const monsterIds = dungeonMonsterPoolThrough(d.monsterPool!, 1).map((c) => c.instanceId);
    const recovered = recoverHamletPools(
      {
        ...d,
        monsterPool: {
          ...d.monsterPool!,
          remaining: monsterIds,
          discarded: [],
          active: null,
        },
      },
      game.seed,
    );
    if (recovered.status === "refused") throw new Error(recovered.reason);
    expect(recovered.status).toBe("resolved");
  });
});
