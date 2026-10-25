import { expect, it } from "vitest";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import { basicQuests, storedDistributionMatchesQuest } from "../../data/src/basic-quests";
import { roomDistributionSchema, roomDistributionTokenTotal } from "../../data/src/dungeon-layout";
import { resolveRoomDistributionForEmbark } from "./room-distribution-resolve";

it("Forward Camps 分布：empty×3 + randomizeNonObjective×5，代币总数 8（R-112）", () => {
  const parsed = roomDistributionSchema.parse(forwardCamps);
  expect(parsed).toMatchObject({
    questId: "quest:p012",
    counts: [{ kind: "empty", count: 3 }],
    randomizeNonObjective: 5,
  });
  expect(roomDistributionTokenTotal(parsed)).toBe(8);
  const quest = basicQuests.find((q) => q.id === "quest:p012")!;
  expect(quest.distribution).toEqual(parsed);
  expect(quest).toMatchObject({
    name: "Forward Camps III",
    level: 3,
    restPoints: 8,
    maxRooms: 8,
  });
});

it("出征展开：种子 42 cursor 0 黄金展开 counts", () => {
  const template = roomDistributionSchema.parse(forwardCamps);
  const { distribution, cursor } = resolveRoomDistributionForEmbark(template, 42, 0);
  expect(cursor).toBe(5);
  expect(roomDistributionTokenTotal(distribution)).toBe(8);
  expect(distribution.randomizeNonObjective).toBeUndefined();
  expect(distribution.counts.find((c) => c.kind === "empty")).toEqual({ kind: "empty", count: 3 });
  expect(storedDistributionMatchesQuest(distribution, template)).toBe(true);
  expect(distribution.counts).toEqual([
    { kind: "empty", count: 3 },
    { kind: "lair", count: 2 },
    { kind: "treasure", count: 1 },
    { kind: "trap", count: 1 },
    { kind: "dark", count: 1 },
  ]);
});
