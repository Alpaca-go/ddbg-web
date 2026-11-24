import { expect, it } from "vitest";
import { wealdTaskSources } from "../../src/test-helpers/weald-task-battle";
import { naturalParty, naturalQuest } from "../../src/test-helpers/natural-quest";
import { createCoreDungeonQuest } from "../../src/dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";

it.each([
  "quest:weald:p006",
  "quest:weald:p008",
  "quest:weald:p009",
  "quest:weald:p010",
  "quest:weald:p011",
  "quest:weald:p012",
  "quest:weald:p013",
  "quest:weald:p014",
] as const)(
  "%s 固定seed0原策略与完整初始日志恢复",
  (questId) => {
    const packs = ["core", "weald"] as const;
    const initial = createCoreDungeonQuest(
      0,
      questId,
      "radiant",
      naturalParty,
      wealdTaskSources,
      true,
      "full",
      packs,
      undefined,
      undefined,
      "tasks-v1",
    );
    const run = naturalQuest(0, questId, true, wealdTaskSources, 2, {
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
      questId,
      mode: "radiant" as const,
      party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      contentPacks: [...packs],
      bossEdgeRooms: true,
      stygianRoomRules: "full" as const,
      wealdHigherQuestOffers: "tasks-v1" as const,
    };
    expect(
      loadQuestSave(
        JSON.parse(
          JSON.stringify(createQuestSave(start, run.commands, run.state, wealdTaskSources)),
        ),
        wealdTaskSources,
      ).game,
    ).toEqual(run.state);
  },
  60000,
);
