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
import { applyCommand, type GameState } from "./command";
import { recoverHamletPools } from "./hamlet-return-pools";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import {
  WEALD_CRONE_EXCEPTION_CARD_ID,
  WEALD_CRONE_EXCEPTION_INSTANCE_ID,
  spawnCircleOfWitchesEncounter,
} from "./expansions/weald/circle-of-witches-spawn";
import { selectWealdRoomTile } from "./expansions/weald/room-tile-selection";
import { WEALD_APPROVED_ROOM_CARDS } from "./expansions/weald/room-catalog";
import type { SpawnCard } from "./spawn";
import { questMonsterOutsidePoolInstanceIds } from "./quest-monster-spawn";

const wealdSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curio).cards },
};
const packs = ["core", "weald"] as const;
const QUEST = "quest:weald:p002" as const;

function atObjectiveRoom(game: GameState, seed: number): GameState {
  const d = game.dungeon!;
  const objectiveId = d.rooms.find((r) => r.kind === "objective")!.id;
  const asideCard = WEALD_APPROVED_ROOM_CARDS.find((c) => c.id === "room:weald:p009")!;
  const tile = selectWealdRoomTile(asideCard);
  if (tile.status !== "matched") throw new Error(tile.reason);
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position: objectiveId,
      cursor: seed,
      rooms: d.rooms.map((r) =>
        r.id === objectiveId ? { ...r, revealed: true, cleared: false } : r,
      ),
      roomCards: {
        ...d.roomCards!,
        active: {
          roomId: objectiveId,
          cardId: asideCard.id,
          tileId: tile.tile.id,
          blockedReason: "p002 夹具",
        },
      },
    },
  };
}

function atTreasureRoom(game: GameState, seed: number): GameState {
  const d = game.dungeon!;
  const lairId = d.rooms.find((r) => r.kind === "treasure")!.id;
  const otherCard = WEALD_APPROVED_ROOM_CARDS.find((c) => c.id !== "room:weald:p009" && !c.boss)!;
  const tile = selectWealdRoomTile(otherCard!);
  if (tile.status !== "matched") throw new Error(tile.reason);
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position: lairId,
      cursor: seed,
      rooms: d.rooms.map((r) => (r.id === lairId ? { ...r, revealed: true, cleared: false } : r)),
      roomCards: {
        ...d.roomCards!,
        active: {
          roomId: lairId,
          cardId: otherCard!.id,
          tileId: tile.tile.id,
          blockedReason: "非目标房宝藏夹具",
        },
      },
    },
  };
}

describe("Circle of Witches 沙盒出征（R-244 / R-247）", () => {
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

  it("createCoreDungeonQuest 混池九房与 R-250 八槽 QuestMap", () => {
    const game = createCoreDungeonQuest(
      21,
      QUEST,
      "radiant",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const d = game.dungeon!;
    expect(d.setAsideRoomCardId).toBe("room:weald:p009");
    expect(d.questExceptionComponentAvailable).toBe(true);
    expect(d.questExceptionCroneKills).toBe(0);
    const expectedLayout = pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === QUEST)!),
      21,
      0,
    );
    expect(d.layout.id).toBe(expectedLayout.id);
    expect(d.layout.review).toBe("confirmed");
    expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(45);
    expect(d.roomCards!.cards).toHaveLength(9);
    expect((d.roomCards!.deck ?? []).includes("room:weald:p009")).toBe(false);
  });

  it("目标房开战：1 只 II Crone 先部署再补 I 级", () => {
    const base = createCoreDungeonQuest(
      31,
      QUEST,
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const state = atObjectiveRoom(base, 2);
    const deployed = applyCommand(state, { type: "prepareDungeonMonsters" });
    expect(deployed.events.some((e) => e.type === "commandRefused")).toBe(false);
    const active = deployed.state.dungeon!.monsterPool!.active!;
    expect(active.monsters.some((m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID)).toBe(true);
    expect(active.monsters).toHaveLength(4);
    const crone = active.monsters.find((m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID)!;
    expect(crone.edge).toBe("back");
    expect(crone.stance).toBe("support");
    expect(questMonsterOutsidePoolInstanceIds(deployed.state.dungeon!)).toEqual([
      WEALD_CRONE_EXCEPTION_INSTANCE_ID,
    ]);
  });

  it("非目标房不开例外 Crone", () => {
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
    const state = atTreasureRoom(base, 2);
    const deployed = applyCommand(state, { type: "prepareDungeonMonsters" });
    expect(deployed.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(
      deployed.state.dungeon!.monsterPool!.active!.monsters.some(
        (m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID,
      ),
    ).toBe(false);
  });

  it("Crone 在抽牌序首位；四格满时 I 级大型怪替换小型（与 R-247 补满同源）", () => {
    const deployment = {
      aggressive: "E",
      defensive: "D",
      ranged: "G",
      support: "B",
    } as const;
    const small = (n: number): SpawnCard => ({
      instanceId: `monster-deck:weald:p00${n}`,
      cardId: "monster_medium:weald:p001",
      edge: "front",
      stanceSlots: 1,
      verified: true,
    });
    const large: SpawnCard = {
      instanceId: "monster-deck:weald:p004",
      cardId: "monster_large:weald:p001",
      edge: "front",
      stanceSlots: 2,
      verified: true,
    };
    const crone: SpawnCard = {
      instanceId: WEALD_CRONE_EXCEPTION_INSTANCE_ID,
      cardId: WEALD_CRONE_EXCEPTION_CARD_ID,
      edge: "back",
      stanceSlots: 1,
      verified: false,
    };
    const ordered = spawnCircleOfWitchesEncounter(
      crone,
      [small(1), small(2), small(3), large],
      deployment,
    );
    if (ordered.type === "refused") throw new Error(ordered.reason);
    expect(ordered.monsters.some((m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID)).toBe(true);
    expect(ordered.monsters.reduce((n, m) => n + m.stanceSlots, 0)).toBe(4);
  });

  it("击杀 0/1/2/3 只 Crone → 回村 XP 0/1/2/3", () => {
    const base = createCoreDungeonQuest(
      51,
      QUEST,
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    for (const kills of [0, 1, 2, 3]) {
      const exited: GameState = {
        ...base,
        dungeon: {
          ...base.dungeon!,
          phase: "exited",
          questExceptionCroneKills: kills,
        },
      };
      const result = applyCommand(exited, { type: "summarizeDungeonQuest" });
      expect(result.state.dungeon!.questSummary).toMatchObject({
        questId: QUEST,
        xpPerHero: kills,
        stagecoachXp: kills,
      });
    }
  });

  it("连续两场目标房可再部署 Crone（组件复用）", () => {
    const base = createCoreDungeonQuest(
      61,
      QUEST,
      "standard",
      coreParty,
      wealdSources,
      true,
      "full",
      [...packs],
    );
    const first = applyCommand(atObjectiveRoom(base, 3), { type: "prepareDungeonMonsters" }).state;
    expect(first.dungeon!.questExceptionComponentAvailable).toBe(false);
    const poolAfter = first.dungeon!.monsterPool!;
    const returnedIds = [
      ...poolAfter.remaining!,
      ...poolAfter.discarded,
      ...poolAfter
        .active!.monsters.filter((m) => m.instanceId !== WEALD_CRONE_EXCEPTION_INSTANCE_ID)
        .map((m) => m.instanceId),
    ];
    const between = {
      ...first,
      dungeon: {
        ...first.dungeon!,
        monsterPool: {
          ...poolAfter,
          active: null,
          remaining: returnedIds,
          discarded: [],
        },
        questExceptionComponentAvailable: true,
      },
    };
    const second = applyCommand(atObjectiveRoom(between, 4), { type: "prepareDungeonMonsters" });
    expect(second.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(
      second.state.dungeon!.monsterPool!.active!.monsters.some(
        (m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID,
      ),
    ).toBe(true);
  });

  it("回村前怪物牌池守恒（不含例外实例）", () => {
    const game = createCoreDungeonQuest(
      17,
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
