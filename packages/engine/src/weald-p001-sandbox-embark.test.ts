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

describe("Fungal Research 沙盒出征（步骤 5，R-246 brought back）", () => {
  it("未选 Weald 包时沙盒列表与创建均不可用", () => {
    expect(sandboxEmbarkQuestsForPacks(["core"]).map((q) => q.id)).not.toContain(
      "quest:weald:p001",
    );
    expect(() =>
      createCoreDungeonQuest(
        3,
        "quest:weald:p001",
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
    expect(sandboxIds).toContain("quest:weald:p001");
    expect(questsForContentPacks(1, [...packs]).map((q) => q.id)).not.toContain("quest:weald:p001");
    expect(questsForCampaignLevel(1).map((q) => q.id)).not.toContain("quest:weald:p001");
    expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p001", [...packs])).toBeNull();
  });

  it("createCoreDungeonQuest：混池怪物、无 wealdLocalOnly、QuestMap 核心八槽", () => {
    const game = createCoreDungeonQuest(
      23,
      "quest:weald:p001",
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    expect(d.contentPacks).toEqual(["core", "weald"]);
    expect(d.questDistribution?.questId).toBe("quest:weald:p001");
    expect(d.monsterPool?.monsterDrawScope).toBeUndefined();
    expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(45);
    const expectedLayout = pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === "quest:weald:p001")!),
      23,
      0,
    );
    expect(d.layout.id).toBe(expectedLayout.id);
    expect(d.layout.review).toBe("confirmed");
    expect(d.roomCards!.cards).toHaveLength(9);
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 3],
    [7, 3],
  ] as const)("brought back %i → 回村 XP %i", (broughtBack, xp) => {
    const base = createCoreDungeonQuest(
      41,
      "quest:weald:p001",
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const exited = (count: number, objectiveMet: boolean): GameState => ({
      ...base,
      dungeon: {
        ...base.dungeon!,
        phase: "exited",
        necroticFungusBroughtBackCount: count,
        fungalResearchObjectiveMet: objectiveMet,
        roomCards: { ...base.dungeon!.roomCards!, active: null },
        monsterPool: { ...base.dungeon!.monsterPool!, active: null },
        rooms: base.dungeon!.rooms.map((r) => ({ ...r, revealed: true, cleared: false })),
      },
    });
    const summary = applyCommand(exited(broughtBack, broughtBack > 0), {
      type: "summarizeDungeonQuest",
    });
    expect(summary.state.dungeon!.questSummary).toMatchObject({
      questId: "quest:weald:p001",
      broughtBackCount: broughtBack,
      xpPerHero: xp,
      stagecoachXp: xp,
    });
  });

  it("全砸仍可计 brought back；objective 与 XP 分开", () => {
    const base = createCoreDungeonQuest(
      9,
      "quest:weald:p001",
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const exited: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        phase: "exited",
        necroticFungusBroughtBackCount: 3,
        fungalResearchObjectiveMet: false,
        roomCards: { ...base.dungeon!.roomCards!, active: null },
        monsterPool: { ...base.dungeon!.monsterPool!, active: null },
        rooms: base.dungeon!.rooms.map((r) => ({ ...r, revealed: true, cleared: false })),
      },
    };
    const summary = applyCommand(exited, { type: "summarizeDungeonQuest" });
    expect(summary.state.dungeon!.questSummary).toMatchObject({
      broughtBackCount: 3,
      objectiveMet: false,
      xpPerHero: 3,
    });
  });

  it("回村前房间与怪物牌池守恒（Weald 九房）", () => {
    const game = createCoreDungeonQuest(
      23,
      "quest:weald:p001",
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
