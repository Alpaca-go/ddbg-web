import { expect, it } from "vitest";
import { planCrowding } from "../../../src/shared/core/crowding";
import { resolveShuffle } from "../../../src/shared/core/shuffle";
import type { BattleArea, BattleEntity } from "../../../src/shared/battle/battle";
import { createBattleState } from "../../../src/shared/battle/battle";
import { applyCommand } from "../../../src/shared/core/command";
import { savedCommandSchema } from "../../../../data/src/quest-save";

const area = (id: string, adjacent: string[], capacity: number): BattleArea => ({
  id,
  adjacent,
  capacity,
  elevation: "normal",
});
const entity = (
  id: string,
  areaId: string,
  stance: BattleEntity["stance"] = "aggressive",
  side: "hero" | "monster" = "hero",
  stanceSlots: 1 | 2 = 1,
): BattleEntity => ({
  id,
  areaId,
  stance,
  side,
  stanceSlots,
  hero: side === "hero" ? "CRUSADER" : null,
  life: 10,
  wounds: 0,
  dodge: 0,
  guard: false,
  dead: false,
  bleed: [],
  blight: [],
  skillIds: [],
});
const random = () => 0;
it("R-271：新命令版本可序列化，拒绝命令不提交切换", () => {
  const state = createBattleState(4, {
    areas: [area("a", [], 4)],
    entities: [],
    skills: [],
    light: 5,
  });
  const command = { type: "startBattle", chainCrowding: true } as const;
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(command)))).toEqual(command);
  const refused = applyCommand(state, {
    type: "prepareMonsterAction",
    actorId: "missing",
    chainCrowding: true,
  });
  expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(refused.state).toBe(state);
  expect(refused.state.chainCrowding).toBeUndefined();
});
it("R-271：免疫者未被挤出时仍可按R-199让位改姿态，棋子留原区", () => {
  const areas = [area("a", ["b"], 4), area("b", ["a"], 4)];
  const entities = [
    entity("target", "b", "ranged", "monster"),
    entity("immune", "a", "aggressive", "monster"),
  ];
  const result = resolveShuffle(
    { areas, entities, crowding: { random, immovable: (e) => e.id === "immune" } },
    { entityId: "target", relativeToAreaId: "a", move: { direction: "pull", distance: 2 } },
  );
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw Error("未结算");
  expect(result.entities.find((e) => e.id === "target")).toMatchObject({
    areaId: "a",
    stance: "aggressive",
  });
  expect(result.entities.find((e) => e.id === "immune")).toMatchObject({
    areaId: "a",
    stance: "defensive",
  });
});
it("R-271：大型召唤优先挤两名英雄，整组去同一邻区且不改姿态", () => {
  const entities = [
    entity("h2", "a", "defensive"),
    entity("h1", "a"),
    entity("m", "a", "aggressive", "monster", 2),
  ];
  const before = structuredClone(entities);
  const plan = planCrowding([area("a", ["b"], 4), area("b", ["a"], 2)], entities, "a", 2, random)!;
  expect(plan.entities.map((e) => [e.id, e.areaId, e.stance])).toEqual([
    ["h2", "b", "defensive"],
    ["h1", "b", "aggressive"],
    ["m", "a", "aggressive"],
  ]);
  expect(entities).toEqual(before);
});
it("R-271：只挤到够用，英雄姿态靠前者先走", () => {
  const plan = planCrowding(
    [area("a", ["b"], 2), area("b", ["a"], 2)],
    [entity("rear", "a", "support"), entity("front", "a")],
    "a",
    1,
    random,
  )!;
  expect(plan.entities.map((e) => e.areaId)).toEqual(["a", "b"]);
});
it("R-271：棋子数并列选剩余容量最多，大型只计一个棋子", () => {
  const plan = planCrowding(
    [area("a", ["b", "c"], 1), area("b", ["a"], 2), area("c", ["a"], 5)],
    [entity("h", "a"), entity("small", "b"), entity("large", "c", "aggressive", "monster", 2)],
    "a",
    1,
    random,
  )!;
  expect(plan.entities[0]!.areaId).toBe("c");
  expect(plan.rolls).toBe(0);
});
it("R-271：逐级挤旧单位，原落点新单位留在原区；封闭环失败且不提交", () => {
  const entities = [entity("h", "a"), entity("m", "b", "aggressive", "monster")];
  const areas = [area("a", ["b"], 1), area("b", ["a", "c"], 1), area("c", ["b"], 1)];
  expect(planCrowding(areas, entities, "a", 1, random)!.entities.map((e) => e.areaId)).toEqual([
    "b",
    "c",
  ]);
  expect(
    planCrowding(
      areas.slice(0, 2).map((a) => ({ ...a, adjacent: a.adjacent.filter((id) => id !== "c") })),
      entities,
      "a",
      1,
      random,
    ),
  ).toBeNull();
  expect(entities.map((e) => e.areaId)).toEqual(["a", "b"]);
});
it("R-271：大型可进入余一格的容量二区继续挤，容量一区不可", () => {
  const entities = [entity("large", "a", "aggressive", "monster", 2), entity("h", "b")];
  const areas = [area("a", ["b"], 2), area("b", ["a", "c"], 2), area("c", ["b"], 1)];
  expect(planCrowding(areas, entities, "a", 1, random)!.entities.map((e) => e.areaId)).toEqual([
    "b",
    "c",
  ]);
  expect(
    planCrowding(
      areas.map((a) => (a.id === "b" ? { ...a, capacity: 1 } : a)),
      entities,
      "a",
      1,
      random,
    ),
  ).toBeNull();
});
it("R-271：平局由种子取值决定，落点自身太小直接失败", () => {
  const areas = [area("a", ["b", "c"], 1), area("b", ["a"], 2), area("c", ["a"], 2)];
  expect(planCrowding(areas, [entity("h", "a")], "a", 1, () => 0.9)!.entities[0]!.areaId).toBe("c");
  expect(planCrowding(areas, [], "a", 2, random)).toBeNull();
});
it("R-271：免疫单位挡住挤压时不改挤其他单位", () => {
  const entities = [entity("immune", "a"), entity("other", "a", "support")];
  expect(
    planCrowding(
      [area("a", ["b"], 2), area("b", ["a"], 2)],
      entities,
      "a",
      1,
      random,
      (e) => e.id === "immune",
    ),
  ).toBeNull();
});
it.each(["push", "pull"] as const)("R-271：%s 连锁失败保留已走区域、姿态不动", (direction) => {
  const areas = [
    area("a", ["b"], 1),
    area("b", ["a", "c"], 1),
    area("c", ["b", "d"], 1),
    area("d", ["c"], 1),
  ];
  const entities = [
    entity("target", direction === "push" ? "a" : "d", "defensive", "monster"),
    entity("immune", direction === "push" ? "c" : "b"),
  ];
  const result = resolveShuffle(
    { areas, entities, crowding: { random, immovable: (e) => e.id === "immune" } },
    { entityId: "target", relativeToAreaId: "a", move: { direction, distance: 2 } },
  );
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw Error("未结算");
  expect(result.areaSteps).toBe(1);
  expect(result.stanceSteps).toBe(0);
  expect(result.entities.find((e) => e.id === "target")!.areaId).toBe(
    direction === "push" ? "b" : "c",
  );
  expect(result.entities.find((e) => e.id === "target")!.stance).toBe("defensive");
});
