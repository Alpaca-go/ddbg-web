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

describe("Patrol the Woods 沙盒出征（步骤 5 第一刀）", () => {
  it("未选 Weald 包时沙盒列表与创建均不可用", () => {
    expect(sandboxEmbarkQuestsForPacks(["core"]).map((q) => q.id)).not.toContain(
      "quest:weald:p005",
    );
    expect(() =>
      createCoreDungeonQuest(
        3,
        "quest:weald:p005",
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
    expect(sandboxEmbarkQuestsForPacks([...packs]).map((q) => q.id)).toContain("quest:weald:p005");
    expect(questsForContentPacks(1, [...packs]).map((q) => q.id)).not.toContain("quest:weald:p005");
    expect(questsForCampaignLevel(1).map((q) => q.id)).not.toContain("quest:weald:p005");
    expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p002", [...packs])).toMatch(
      /尚未开放/,
    );
    expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p005", [...packs])).toBeNull();
  });

  it("createCoreDungeonQuest 接线 Weald 怪物+奇物+九张房间与 contentPacks", () => {
    const game = createCoreDungeonQuest(
      17,
      "quest:weald:p005",
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    expect(d.contentPacks).toEqual(["core", "weald"]);
    expect(d.questDistribution?.questId).toBe("quest:weald:p005");
    const expectedLayout = pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === "quest:weald:p005")!),
      17,
      0,
    );
    expect(d.layout.id).toBe(expectedLayout.id);
    expect(d.layout.review).toBe("confirmed");
    expect(d.layout.id).toMatch(/^quest_map:p/);
    expect(d.roomCards!.cards).toHaveLength(9);
    expect(d.roomCards!.cards.every((c) => c.id.startsWith("room:weald:"))).toBe(true);
    expect(d.curio!.cards.filter((c) => c.id.startsWith("curio:weald:"))).toHaveLength(16);
    expect(d.monsterPool?.monsterDrawScope).toBeUndefined();
    expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(45);
    expect(d.explorationSetup?.dungeonLevel).toBe(1);
  });

  it("清房 XP：2 间 1 XP、最多 3（R-038）", () => {
    const base = createCoreDungeonQuest(
      41,
      "quest:weald:p005",
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const cleared = (count: number): GameState => ({
      ...base,
      dungeon: {
        ...base.dungeon!,
        phase: "exited",
        rooms: base
          .dungeon!.rooms.filter((r) => r.kind !== "trap")
          .map((r, i) =>
            i < count
              ? { ...r, revealed: true, cleared: true }
              : { ...r, revealed: true, cleared: false },
          )
          .concat(
            base
              .dungeon!.rooms.filter((r) => r.kind === "trap")
              .map((r) => ({ ...r, revealed: true, cleared: false })),
          ),
      },
    });
    for (const count of [0, 2, 4, 6]) {
      const result = applyCommand(cleared(count), { type: "summarizeDungeonQuest" });
      expect(result.state.dungeon!.questSummary).toMatchObject({
        questId: "quest:weald:p005",
        xpPerHero: Math.min(3, Math.floor(count / 2)),
        stagecoachXp: Math.min(3, Math.floor(count / 2)),
      });
    }
  });

  it("回村前房间与怪物牌池守恒（Weald 九房）", () => {
    const game = createCoreDungeonQuest(
      17,
      "quest:weald:p005",
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
