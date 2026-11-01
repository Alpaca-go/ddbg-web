import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { MonsterCardView } from "./monster-skill";
import { resolveDarkestMonsterSupport } from "./darkest-monster-support";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;
const cases = [
  { id: "monster_medium:p069", slot: 2, wounds: 11, statuses: [], move: null },
  {
    id: "monster_medium:p086",
    slot: 1,
    wounds: 20,
    statuses: [{ kind: "buff", duration: 3 }],
    move: null,
  },
  {
    id: "monster_medium:p086",
    slot: 2,
    wounds: 3,
    statuses: [],
    move: { direction: "push", distance: 2 },
  },
].filter(
  (entry) =>
    cards.find((c) => c.id === entry.id)!.skills.find((s) => s.slot === entry.slot)!
      .verified_monster_effects,
);
it.each(cases)(
  "$id / $slot 友方最小纯结算、越界与漂移原子拒绝",
  ({ id, slot, wounds, statuses, move }) => {
    const card = cards.find((c) => c.id === id)!;
    const context = { targetSide: "monster" as const, targetWounds: 20, areaDistance: 0 };
    const before = structuredClone(card);
    const result = resolveDarkestMonsterSupport(card, slot, context);
    expect(result).toEqual({
      status: "resolved",
      targetWounds: wounds,
      targetStatusEffects: statuses,
      actorShuffle: move,
    });
    expect(resolveDarkestMonsterSupport(card, slot, context)).toEqual(result);
    expect(
      resolveDarkestMonsterSupport(card, slot, { ...context, targetSide: "hero" }).status,
    ).toBe("refused");
    expect(resolveDarkestMonsterSupport(card, slot, { ...context, areaDistance: 10 }).status).toBe(
      "refused",
    );
    expect(resolveDarkestMonsterSupport(card, slot, { ...context, targetWounds: -1 }).status).toBe(
      "refused",
    );
    const changed = structuredClone(card);
    const skill = changed.skills.find((s) => s.slot === slot)!;
    Object.assign(skill.verified_monster_effects!, { signatures: ["bad"] });
    expect(resolveDarkestMonsterSupport(changed, slot, context).status).toBe("refused");
    expect(card).toEqual(before);
    if (move)
      expect(
        resolveDarkestMonsterSupport(card, slot, { ...context, actorShuffleResist: true }),
      ).toMatchObject({ status: "resolved", actorShuffle: { distance: 1 } });
  },
);
it("友方治疗封顶为零伤口", () => {
  expect(
    resolveDarkestMonsterSupport(
      cards.find((c) => c.id === "monster_medium:p069")!,
      2,
      { targetSide: "monster", targetWounds: 3, areaDistance: 0 },
    ),
  ).toMatchObject({ status: "resolved", targetWounds: 0 });
});
