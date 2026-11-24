import { expect, it } from "vitest";
import { remainingQuestIdsForLocationDeck } from "../../src/shared/hamlet/hamlet-location-quest-draw";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty } from "../helpers/core-quest";
import { wealdTaskSources } from "../helpers/weald-task-battle";
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
it.each(ids.slice(0, 9))("%s 缺 tasks-v1 拒绝（standard/radiant/stygian 一致）", (id) => {
  for (const mode of ["radiant", "stygian"] as const) {
    expect(() =>
      createCoreDungeonQuest(0, id, mode, coreParty, wealdTaskSources, true, "full", [
        "core",
        "weald",
      ]),
    ).toThrow();
  }
});

it("p006 tasks-v1 Stygian 与 radiant 同等级出征上下文", () => {
  const radiant = createCoreDungeonQuest(
    0,
    "quest:weald:p006",
    "radiant",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
  const stygian = createCoreDungeonQuest(
    0,
    "quest:weald:p006",
    "stygian",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
  expect(stygian.dungeon!.campaignLevel).toBe(radiant.dungeon!.campaignLevel);
  expect(stygian.dungeon!.monsterPool).toEqual(radiant.dungeon!.monsterPool);
  expect(stygian.dungeon!.mode).toBe("stygian");
  expect(stygian.dungeon!.gold).toBe(0);
  expect(radiant.dungeon!.gold).toBeGreaterThan(0);
});
