import { expect, it } from "vitest";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import { basicQuests, storedDistributionMatchesQuest } from "../../data/src/basic-quests";
import {
  randomNonObjectiveRoomKinds,
  roomDistributionEmbarkBlockReason,
  roomDistributionSchema,
  roomDistributionTokenTotal,
} from "../../data/src/dungeon-layout";
import {
  buildNonObjectiveRoomTokenPool,
  drawAndMaterializeRoomDistribution,
  nonObjectiveRoomTokenPoolCopiesPerKind,
} from "../../data/src/room-distribution-expand";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import { createDungeonSandbox } from "./dungeon";
import { expandRoomDistributionForEmbark } from "./room-distribution-expand";
import { createRng } from "./rng";

it("Forward Camps 分布：empty×3、Objective×0、randomizeNonObjective×5，代币总数 8（R-112）", () => {
  const parsed = roomDistributionSchema.parse(forwardCamps);
  expect(parsed).toMatchObject({
    questId: "quest:p012",
    counts: [{ kind: "empty", count: 3 }],
    randomizeNonObjective: 5,
  });
  expect(parsed.counts.some((c) => c.kind === "objective")).toBe(false);
  expect(roomDistributionTokenTotal(parsed)).toBe(8);
  const quest = basicQuests.find((q) => q.id === "quest:p012")!;
  expect(quest.distribution).toEqual(parsed);
  expect(quest).toMatchObject({
    name: "Forward Camps III",
    level: 3,
    restPoints: 8,
    maxRooms: 3,
  });
});

it("Q-112b：未展开模板仍拒出征；建局展开后可出征", () => {
  const template = roomDistributionSchema.parse(forwardCamps);
  const reason = roomDistributionEmbarkBlockReason(template);
  expect(reason).toMatch(/Q-112b/);
  expect(reason).toContain("quest:p012");

  const { distribution } = expandRoomDistributionForEmbark(template, 42, 0);
  expect(roomDistributionEmbarkBlockReason(distribution)).toBeNull();
  expect(distribution.randomizeNonObjective).toBeUndefined();
  expect(roomDistributionTokenTotal(distribution)).toBe(8);
  expect(distribution.counts.find((c) => c.kind === "empty")?.count).toBe(3);
  expect(distribution.counts.some((c) => c.kind === "objective")).toBe(false);
  expect(storedDistributionMatchesQuest(distribution, template)).toBe(true);

  const sandbox = createDungeonSandbox(42, layout, template);
  expect(sandbox.dungeon!.rooms).toHaveLength(8);
  expect(sandbox.dungeon!.questDistribution).toEqual(distribution);
});

it("Q-112b：从五类实体池无放回抽 5，禁止独立匀掷 kind（任一类 ≤ 池容量）", () => {
  const template = roomDistributionSchema.parse(forwardCamps);
  const pool = buildNonObjectiveRoomTokenPool();
  expect(pool).toHaveLength(
    randomNonObjectiveRoomKinds.length * nonObjectiveRoomTokenPoolCopiesPerKind,
  );

  for (let seed = 0; seed < 200; seed += 1) {
    const rng = createRng(seed);
    const expanded = drawAndMaterializeRoomDistribution(template, () => rng.next());
    const randomRows = expanded.counts.filter((c) => c.kind !== "empty");
    const randomTotal = randomRows.reduce((n, c) => n + c.count, 0);
    expect(randomTotal).toBe(5);
    for (const row of randomRows) {
      expect(randomNonObjectiveRoomKinds).toContain(row.kind);
      expect(row.count).toBeLessThanOrEqual(nonObjectiveRoomTokenPoolCopiesPerKind);
    }
  }
});

it("Q-112b：同种子同游标展开结果确定", () => {
  const template = roomDistributionSchema.parse(forwardCamps);
  const a = expandRoomDistributionForEmbark(template, 99, 7);
  const b = expandRoomDistributionForEmbark(template, 99, 7);
  expect(a.distribution).toEqual(b.distribution);
  expect(a.cursor).toBe(b.cursor);
});
