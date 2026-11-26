import { expect, it } from "vitest";
import { WEALD_SHRIEKER_I_CONTENT as content } from "../../../../src/weald/bosses/shrieker/shrieker-i-content";
import {
  shriekerIInitialDeployment,
  shriekerINestAllowsEntry,
  shriekerINestRemovalIds,
} from "../../../../src/weald/bosses/shrieker/shrieker-i-deployment";

it("W3／R-261 两个大型实体占满四姿态，共处容量五的 E；英雄在 J／C", () => {
  const before = structuredClone(content);
  const plan = shriekerIInitialDeployment();
  expect(plan.entities.map((entity) => [entity.areaId, entity.stance, entity.stanceSlots])).toEqual(
    [
      ["E", "aggressive", 2],
      ["E", "ranged", 2],
    ],
  );
  expect(plan.entities.map((entity) => [entity.life, entity.dodge, entity.shuffleResist])).toEqual([
    [49, 2, false],
    [20, 0, true],
  ]);
  expect(plan.heroStanceAreas).toEqual({
    aggressive: "J",
    defensive: "J",
    ranged: "C",
    support: "C",
  });
  expect(plan.areas.find((area) => area.id === "E")?.capacity).toBe(5);
  expect(plan.lootAreas).toEqual(["A", "E", "I"]);
  expect(plan.initiativeCards).toEqual({ hero: 4, monster: 3 });
  plan.entities.pop();
  plan.lootAreas.pop();
  expect(shriekerIInitialDeployment().entities[0]!.bleed).toEqual([]);
  expect(content).toEqual(before);
});

it("Nest 在场只准 Shrieker 进入其实际所在区；不阻止离开或进入其他区", () => {
  const [shrieker, nest] = shriekerIInitialDeployment().entities;
  const hero = {
    ...shrieker!,
    id: "hero",
    side: "hero" as const,
    monsterCardId: "hero:placeholder",
  };
  const other = { ...shrieker!, id: "other", monsterCardId: "monster:other" };
  const entities = [shrieker!, nest!];
  expect(shriekerINestAllowsEntry(entities, shrieker!, "E")).toBe(true);
  for (const actor of [hero, other, nest!]) {
    expect(shriekerINestAllowsEntry(entities, actor, "E")).toBe(false);
    expect(shriekerINestAllowsEntry(entities, actor, "F")).toBe(true);
    expect(shriekerINestAllowsEntry([shrieker!, { ...nest!, dead: true }], actor, "E")).toBe(true);
  }
  const moved = [shrieker!, { ...nest!, areaId: "F" }];
  expect(shriekerINestAllowsEntry(moved, hero, "E")).toBe(true);
  expect(shriekerINestAllowsEntry(moved, hero, "F")).toBe(false);
  expect(
    shriekerINestAllowsEntry(entities, { ...hero, monsterCardId: shrieker!.monsterCardId! }, "E"),
  ).toBe(false);
});

it("W3 只在本次击败本体时移除活 Nest，Nest 先死不移除本体", () => {
  const [shrieker, nest] = shriekerIInitialDeployment().entities;
  const entities = [{ ...shrieker!, dead: true }, nest!];
  const before = structuredClone(entities);
  expect(shriekerINestRemovalIds(entities, [shrieker!.id])).toEqual([nest!.id]);
  expect(shriekerINestRemovalIds(entities, ["other"])).toEqual([]);
  expect(shriekerINestRemovalIds([shrieker!, nest!], [shrieker!.id])).toEqual([]);
  expect(shriekerINestRemovalIds([shrieker!, { ...nest!, dead: true }], [nest!.id])).toEqual([]);
  expect(
    shriekerINestRemovalIds(
      [
        { ...shrieker!, dead: true },
        { ...nest!, dead: true },
      ],
      [shrieker!.id],
    ),
  ).toEqual([]);
  expect(entities).toEqual(before);
});
