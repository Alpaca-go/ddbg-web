import { expect, it } from "vitest";
import { basicQuests, questPrintedXpCap, questsForContentPacks } from "../../data/src/basic-quests";
import { expeditionLocationEmbarkBlockReason } from "../../data/src/quest-map-pairing";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";

const WEALD_IDS = [
  "quest:weald:p001",
  "quest:weald:p002",
  "quest:weald:p003",
  "quest:weald:p004",
  "quest:weald:p005",
] as const;

it("未选 Weald 包时五张不进村庄 I 级任务池", () => {
  expect(questsForContentPacks(1, ["core"]).map((q) => q.id)).not.toEqual(
    expect.arrayContaining([...WEALD_IDS]),
  );
  expect(questsForContentPacks(1, ["core", "weald"]).map((q) => q.id)).not.toEqual(
    expect.arrayContaining([...WEALD_IDS]),
  );
});

it("p001 XP 登记为 brought back，不再按清 8 房计 XP", () => {
  const p001 = basicQuests.find((q) => q.id === "quest:weald:p001")!;
  expect(p001.xpKind).toBe("broughtBack");
  expect(p001).toMatchObject({ roomsPerXp: 1, broughtBackSubject: "necroticFungus" });
  expect("maxRooms" in p001).toBe(false);
  expect(() => questPrintedXpCap(p001)).toThrow(/broughtBackCount/);
  expect(questPrintedXpCap(p001, { broughtBackCount: 2 })).toBe(2);
});

it("p002–p005 印刷 XP 上限与 xpKind 不变", () => {
  const caps = {
    "quest:weald:p002": { kind: "objective", cap: 3 },
    "quest:weald:p003": { kind: "objective", cap: 3 },
    "quest:weald:p004": { kind: "lair", cap: 3 },
    "quest:weald:p005": { kind: "all", cap: 3 },
  } as const;
  for (const [id, expected] of Object.entries(caps)) {
    const quest = basicQuests.find((q) => q.id === id)!;
    expect(quest.xpKind).toBe(expected.kind);
    expect(questPrintedXpCap(quest)).toBe(expected.cap);
  }
});

it("选了 Weald 包可读登记，但出征闸门仍拒绝", () => {
  for (const id of WEALD_IDS) {
    const quest = basicQuests.find((q) => q.id === id)!;
    expect(quest.expeditionRegion).toBe("weald");
    expect(expeditionLocationEmbarkBlockReason(quest.expeditionRegion)).toMatch(/尚未开放/);
    expect(() =>
      createCoreDungeonQuest(1, id, "radiant", coreParty, coreQuestSources, true, "full", [
        "core",
        "weald",
      ]),
    ).toThrow(/尚未开放/);
  }
});
