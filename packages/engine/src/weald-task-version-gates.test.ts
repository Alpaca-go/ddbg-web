import { expect, it } from "vitest";
import { remainingQuestIdsForLocationDeck } from "./hamlet-location-quest-draw";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty } from "./test-helpers/core-quest";
import { wealdTaskSources } from "./test-helpers/weald-task-battle";
const ids = [
  "quest:weald:p006",
  "quest:weald:p007",
  "quest:weald:p008",
  "quest:weald:p009",
  "quest:weald:p010",
  "quest:weald:p011",
  "quest:weald:p012",
  "quest:weald:p013",
  "quest:weald:p014",
  "quest:weald:p015",
] as const;
it("tasks-v1 II／III 各五张，旧版本不升级", () => {
  const draw = (level: 2 | 3, v?: true | "tasks-v1") =>
    remainingQuestIdsForLocationDeck("weald", level, ["core", "weald"], "quest:p001", [], v);
  expect(draw(2, "tasks-v1")).toEqual(ids.slice(0, 5));
  expect(draw(3, "tasks-v1")).toEqual(ids.slice(5));
  expect(draw(2, true)).toEqual([]);
  expect(draw(3, true)).toEqual(["quest:weald:p015"]);
  expect(draw(2)).toEqual([]);
  expect(draw(3)).toEqual([]);
});
it.each(ids.slice(0, 9))("%s 缺新版本或Stygian拒绝", (id) => {
  expect(() =>
    createCoreDungeonQuest(0, id, "radiant", coreParty, wealdTaskSources, true, "full", [
      "core",
      "weald",
    ]),
  ).toThrow();
  expect(() =>
    createCoreDungeonQuest(
      0,
      id,
      "stygian",
      coreParty,
      wealdTaskSources,
      true,
      "full",
      ["core", "weald"],
      undefined,
      undefined,
      "tasks-v1",
    ),
  ).toThrow();
});
