import { expect, it } from "vitest";
import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import curios from "../../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../../data/src/curio";
import { questStartSchema } from "../../../data/src/quest-save";
import { createCoreDungeonQuest } from "../../src/dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
import { coreQuestSources } from "../../src/test-helpers/core-quest";
import { naturalParty, naturalQuest } from "../../src/test-helpers/natural-quest";

const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};
const packs = ["core", "weald"] as const;
const start = {
  seed: 0,
  questId: "quest:weald:p015" as const,
  mode: "radiant" as const,
  party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  contentPacks: [...packs],
  bossEdgeRooms: true,
  stygianRoomRules: "full" as const,
  whisperingWoodsQuest: true as const,
};
const initial = () =>
  createCoreDungeonQuest(
    0,
    start.questId,
    "radiant",
    naturalParty,
    sources,
    true,
    "full",
    packs,
    undefined,
    true,
  );

it("p015 显式单任务入口：完整初始日志按固定原策略续跑并严格恢复", () => {
  const state = initial();
  expect(state.dungeon!.campaignLevel).toBe(3);
  expect(state.dungeon!.monsterPool!.wealdMonsterLevel).toBe(3);
  const run = naturalQuest(0, start.questId, true, sources, 2, {
    continueFrom: state,
    exitAfterBattles: 1,
    toxicMushrooms: true,
    wealdUnprepared: true,
    wealdPrecious: true,
    wealdAbyssalPuff: true,
    wealdClearing: true,
    wealdOurs: true,
  });
  expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
  expect(run.state.dungeon!.phase).toBe("awaitingReplacement");
  expect(
    run.events.some(
      (e) => e.type === "dungeonUpdated" && e.message.startsWith("Whispering Woods："),
    ),
  ).toBe(true);
  const saved = createQuestSave(start, run.commands, run.state, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), sources).game).toEqual(run.state);
  const marked = run.commands.map((c) =>
    c.type === "startBattle" ? { ...c, wealdWhisperingWoods: true as const } : c,
  );
  const markedSave = createQuestSave(start, marked, run.state, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(markedSave)), sources).commands).toEqual(marked);
}, 60000);

it("旧入口、未选包拒绝；Stygian 显式版本可入；初始存档去版本／篡改状态拒绝", () => {
  expect(() =>
    createCoreDungeonQuest(0, start.questId, "radiant", naturalParty, sources, true, "full", packs),
  ).toThrow();
  const stygian = createCoreDungeonQuest(
    0,
    start.questId,
    "stygian",
    naturalParty,
    sources,
    true,
    "full",
    packs,
    undefined,
    true,
  );
  expect(stygian.dungeon!.mode).toBe("stygian");
  expect(stygian.dungeon!.whisperingWoodsQuest).toBe(true);
  expect(() =>
    createCoreDungeonQuest(
      0,
      start.questId,
      "radiant",
      naturalParty,
      sources,
      true,
      "full",
      ["core"],
      undefined,
      true,
    ),
  ).toThrow();
  expect(questStartSchema.safeParse({ ...start, whisperingWoodsQuest: false }).success).toBe(false);
  const saved = createQuestSave(start, [], initial(), sources);
  const missing = JSON.parse(JSON.stringify(saved)) as typeof saved;
  delete missing.start.whisperingWoodsQuest;
  expect(() => loadQuestSave(missing, sources)).toThrow();
  const changed = JSON.parse(JSON.stringify(saved)) as {
    snapshot: { dungeon: { whisperingWoodsQuest: boolean } };
  };
  changed.snapshot.dungeon.whisperingWoodsQuest = false;
  expect(() => loadQuestSave(changed, sources)).toThrow();
});
