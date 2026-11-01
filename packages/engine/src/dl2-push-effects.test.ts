import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { resolveMonsterSkill, type MonsterCardView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";
const cards: MonsterCardView[] = ["medium", "large"].flatMap(
  (kind) =>
    JSON.parse(
      readFileSync(
        new URL(`../../data/normalized/corebox/monster_${kind}.json`, import.meta.url),
        "utf8",
      ),
    ).cards,
);
it.each(["monster_medium:p013", "monster_large:p001"])(
  "%s 印刷 Push1 命中输出、落空不位移",
  (id) => {
    const card = cards.find((c) => c.id === id)!;
    const combat = {
      actor: { id: "monster", wounds: 0 },
      target: { id: "hero", side: "hero" as const, wounds: 0, stress: 0, dodge: 0 },
      areaDistance: (() => {
        const range = readPrintedRange(card.skills[0]!);
        if (range.kind !== "exact") throw new Error("range");
        return range.distance;
      })(),
      light: 5,
    };
    expect(resolveMonsterSkill(card, 1, combat, 5)).toMatchObject({
      status: "resolved",
      resolution: {
        outcome: "hit",
        skipped: [],
        targetShuffle: { direction: "push", distance: 1 },
      },
    });
    const miss = resolveMonsterSkill(
      card,
      1,
      { ...combat, target: { ...combat.target, dodge: 30 } },
      10,
    );
    expect(miss).toMatchObject({ status: "resolved", resolution: { outcome: "miss" } });
    if (miss.status === "resolved") expect(miss.resolution.targetShuffle).toBeNull();
  },
);
