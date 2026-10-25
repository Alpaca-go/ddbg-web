import { expect, it } from "vitest";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import { basicQuests } from "../../data/src/basic-quests";
import {
  roomDistributionEmbarkBlockReason,
  roomDistributionSchema,
  roomDistributionTokenTotal,
} from "../../data/src/dungeon-layout";

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
    maxRooms: 8,
  });
});

it("Q-112b：待展开 ? 槽拒出征，不静默填满 counts", () => {
  const template = roomDistributionSchema.parse(forwardCamps);
  const reason = roomDistributionEmbarkBlockReason(template);
  expect(reason).toMatch(/Q-112b/);
  expect(reason).toContain("quest:p012");
});
