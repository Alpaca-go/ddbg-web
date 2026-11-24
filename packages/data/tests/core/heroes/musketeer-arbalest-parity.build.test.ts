import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../src/shared/write";
import { lineSignature } from "../../../src/core/heroes/annotations/shared";
import type { NormalizedHeroSkillCard } from "../../../src/shared/schema";

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Sniper Shot", "Aimed Shot"],
  ["Suppressive Fire", "Smokescreen"],
  ["Sniper\u2019s Mark", "Call the Shot"],
  ["Bola", "Buckshot"],
  ["Blindfire", "Sidearm"],
  ["Battlefield Bandage", "Patch Up"],
  ["Rallying Flare", "Skeet Shot"],
];

function pick(
  cards: readonly NormalizedHeroSkillCard[],
  hero: string,
  name: string,
  level: number,
) {
  const hit = cards.find((c) => c.hero === hero && c.name === name && c.level === level);
  if (!hit) throw new Error(`缺少 ${hero} ${name} L${level}`);
  return hit;
}

it("Q-185：Musketeer 与 Arbalest 七族 L1–III 效果与 annotation_* 对齐", () => {
  const cards = loadNormalizedCorebox().hero_skill.cards;
  for (const [arbName, mskName] of PAIRS) {
    for (const level of [1, 2, 3] as const) {
      const arb = pick(cards, "ARBALEST", arbName, level);
      const msk = pick(cards, "MUSKETEER", mskName, level);
      expect(msk.effect_lines.map(lineSignature)).toEqual(arb.effect_lines.map(lineSignature));
      expect(msk.rules?.range ?? null).toEqual(arb.rules?.range ?? null);
      expect(msk.rules?.damage ?? null).toEqual(arb.rules?.damage ?? null);
      expect(msk.rules?.statuses ?? null).toEqual(arb.rules?.statuses ?? null);
      const arbFlare = arb.rules?.rallyingFlare ?? null;
      const mskFlare = msk.rules?.rallyingFlare ?? null;
      if (arbFlare) {
        expect(mskFlare).toMatchObject({
          cleanupSignature: arbFlare.cleanupSignature,
          monsterDebuffSignature: arbFlare.monsterDebuffSignature,
          debuffDuration: arbFlare.debuffDuration,
        });
      } else {
        expect(mskFlare).toBeNull();
      }
    }
  }
});
