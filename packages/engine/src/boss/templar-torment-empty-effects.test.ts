import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolveMonsterSkill, type MonsterCardView } from "../monster-skill";
const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url),
    "utf8",
  ),
).cards;
it.each(["monster_large:p014", "monster_large:p015"])(
  "%s Torment 印刷无效果行，结算伤害且不虚构状态",
  (id) => {
    const card = cards.find((c) => c.id === id)!;
    expect(card.verification.unverified).toBe(false);
    expect(card.skills[0]!.name).toBe("Torment");
    expect(card.skills[0]!.effect_lines).toEqual([]);
    const result = resolveMonsterSkill(
      card,
      1,
      {
        actor: { id: "templar", wounds: 0 },
        target: { id: "hero", side: "hero", wounds: 0, stress: 0, dodge: 0 },
        areaDistance: 2,
        targetsInArea: 2,
        light: 5,
      },
      5,
    );
    expect(result).toMatchObject({
      status: "resolved",
      resolution: {
        outcome: "hit",
        damageDealt: 10,
        targetStress: 0,
        targetShuffle: null,
        skipped: [],
      },
    });
    if (result.status === "resolved")
      expect(result.resolution.targetStatusEffects ?? []).toEqual([]);
  },
);
