import { basicQuests } from "../../../data/src/core/quests/basic-quests";
import { expect, it } from "vitest";
import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import curios from "../../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../../data/src/core/curios/curio";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "../../src/shared/quest/quest-save";
import { coreQuestSources } from "../helpers/core-quest";
import { naturalParty, naturalQuest } from "../helpers/natural-quest";
import { dungeonMonsterPoolThrough } from "../../src/shared/core/monster-pool-runtime";
import { remainingQuestIdsForLocationDeck } from "../../src/shared/hamlet/hamlet-location-quest-draw";

it("Lost Treasures 固定seed0完整日志；II级当地＋通用限制及旧版本隔离", () => {
  const sources = {
    ...coreQuestSources,
    weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
  };
  const packs = ["core", "weald"] as const;
  const initial = createCoreDungeonQuest(
    0,
    "quest:weald:p007",
    "radiant",
    naturalParty,
    sources,
    true,
    "full",
    packs,
    undefined,
    undefined,
    "tasks-v1",
  );
  expect(initial.dungeon!.campaignLevel).toBe(2);
  const pool = dungeonMonsterPoolThrough(initial.dungeon!.monsterPool!, 2);
  expect(
    pool.every(
      (m) =>
        m.instanceId.includes(":weald:") ||
        sources.monsters.some(
          (c) => c.combatCardId === m.cardId && c.level === 2 && c.location === "common",
        ),
    ),
  ).toBe(true);
  const run = naturalQuest(0, "quest:weald:p007", true, sources, 2, {
    continueFrom: initial,
    exitAfterBattles: 1,
    toxicMushrooms: true,
    wealdUnprepared: true,
    wealdPrecious: true,
    wealdAbyssalPuff: true,
    wealdClearing: true,
    wealdOurs: true,
  });
  expect(run.stopReason === null || run.stopReason === "dungeon halted awaitingReplacement").toBe(
    true,
  );
  const start = {
    seed: 0,
    questId: "quest:weald:p007" as const,
    mode: "radiant" as const,
    party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    wealdHigherQuestOffers: "tasks-v1" as const,
  };
  const save = createQuestSave(start, run.commands, run.state, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(run.state);
  expect(remainingQuestIdsForLocationDeck("weald", 2, packs, "", [], true)).toEqual([]);
  expect(remainingQuestIdsForLocationDeck("weald", 2, packs, "", [], "tasks-v1")).toEqual([
    ...basicQuests
      .filter((q) => q.expeditionRegion === "weald" && q.level === 2)
      .map((q) => q.id)
      .sort(),
  ]);
}, 60000);
