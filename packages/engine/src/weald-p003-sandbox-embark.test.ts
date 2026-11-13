import { describe, expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curio from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import {
  questsForCampaignLevel,
  questsForContentPacks,
  sandboxEmbarkQuestsForPacks,
  asQuestMapPairingQuest,
  basicQuests,
} from "../../data/src/basic-quests";
import {
  pickEmbarkQuestMapLayout,
  sandboxExpeditionEmbarkBlockReason,
} from "../../data/src/quest-map-pairing";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "./command";
import { recoverHamletPools } from "./hamlet-return-pools";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { isQuestProvisionId } from "./quest-provisions";

const wealdSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curio).cards },
};
const packs = ["core", "weald"] as const;
const QUEST = "quest:weald:p003" as const;

function finishStartingProvisions(game: GameState): GameState {
  let rolled = applyCommand(game, { type: "rollDungeonProvisions" });
  const log: Command[] = [{ type: "rollDungeonProvisions" }];
  while (rolled.state.dungeon!.phase === "awaitingProvisions") {
    const pending = rolled.pendingChoice ?? rolled.state.dungeon!.pending!;
    const cmd: Command = {
      type: "resolveChoice",
      choiceId: pending.id,
      optionId: "torch",
    };
    log.push(cmd);
    rolled = applyCommand(rolled.state, cmd);
  }
  expect(rolled.state.dungeon!.phase).toBe("ready");
  expect(log.reduce((s, c) => applyCommand(s, c).state, game as GameState)).toEqual(rolled.state);
  return rolled.state;
}

describe("Disinfection 沙盒出征（R-245）", () => {
  it("未选 Weald 包时沙盒列表与创建均不可用", () => {
    expect(sandboxEmbarkQuestsForPacks(["core"]).map((q) => q.id)).not.toContain(QUEST);
    expect(() =>
      createCoreDungeonQuest(3, QUEST, "radiant", coreParty, wealdSources, true, "full", ["core"]),
    ).toThrow(/尚未开放/);
  });

  it("选了包可读沙盒任务，村庄 I 级池仍不含 Weald", () => {
    expect(sandboxEmbarkQuestsForPacks([...packs]).map((q) => q.id)).toContain(QUEST);
    expect(questsForContentPacks(1, [...packs]).map((q) => q.id)).not.toContain(QUEST);
    expect(questsForCampaignLevel(1).map((q) => q.id)).not.toContain(QUEST);
    expect(sandboxExpeditionEmbarkBlockReason("weald", QUEST, [...packs])).toBeNull();
  });

  it("createCoreDungeonQuest 混池九房旁置 p005 与 R-250 八槽 QuestMap", () => {
    const game = createCoreDungeonQuest(
      29,
      QUEST,
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    expect(d.setAsideRoomCardId).toBe("room:weald:p005");
    expect(d.disinfectionOakCount).toBe(0);
    expect(d.questDistribution?.questId).toBe(QUEST);
    expect(d.monsterPool?.monsterDrawScope).toBeUndefined();
    const expectedLayout = pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === QUEST)!),
      29,
      0,
    );
    expect(d.layout.id).toBe(expectedLayout.id);
    expect(d.layout.review).toBe("confirmed");
    expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(45);
    expect(d.roomCards!.cards).toHaveLength(9);
    expect((d.roomCards!.deck ?? []).includes("room:weald:p005")).toBe(false);
  });

  it("开局公共池额外 3 枚普通 Potion（非 R-197 任务药水）", () => {
    const game = createCoreDungeonQuest(
      37,
      QUEST,
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const ready = finishStartingProvisions(game);
    const provisions = ready.dungeon!.explorationSetup!.provisions;
    const bonus = provisions.filter((p) => p.id.startsWith("dungeon-quest-starting-potion:"));
    expect(bonus).toHaveLength(3);
    expect(bonus.every((p) => p.face === "potion")).toBe(true);
    expect(provisions.filter((p) => isQuestProvisionId(p.id))).toHaveLength(0);
    expect(provisions.length).toBe(11);
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 3],
  ] as const)("消毒 %i 棵 → 回村 XP %i", (oaks, expectedXp) => {
    const base = createCoreDungeonQuest(
      44,
      QUEST,
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
        disinfectionOakCount: oaks,
      },
    };
    const result = applyCommand(exited, { type: "summarizeDungeonQuest" });
    expect(result.state.dungeon!.questSummary).toMatchObject({
      questId: QUEST,
      oaksDisinfected: Math.min(3, oaks),
      xpPerHero: expectedXp,
      stagecoachXp: expectedXp,
    });
  });

  it("回村前房间与怪物牌池守恒（Weald 九房）", () => {
    const game = createCoreDungeonQuest(
      52,
      QUEST,
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
