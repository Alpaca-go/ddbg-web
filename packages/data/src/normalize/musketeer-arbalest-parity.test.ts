import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { lineSignature } from "./verified-hero-layout";
import type { NormalizedHeroSkillCard } from "./schema";

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

it("Q-185：Musketeer 与 Arbalest 七族 L1–III 效果与 verified_* 对齐", () => {
  const cards = loadNormalizedCorebox().hero_skill.cards;
  for (const [arbName, mskName] of PAIRS) {
    for (const level of [1, 2, 3] as const) {
      const arb = pick(cards, "ARBALEST", arbName, level);
      const msk = pick(cards, "MUSKETEER", mskName, level);
      expect(msk.effect_lines.map(lineSignature)).toEqual(arb.effect_lines.map(lineSignature));
      expect(msk.verified_range ?? null).toEqual(arb.verified_range ?? null);
      expect(msk.verified_damage_bonus ?? null).toEqual(arb.verified_damage_bonus ?? null);
      expect(msk.verified_status_effects ?? null).toEqual(arb.verified_status_effects ?? null);
      const arbFlare = arb.verified_rallying_flare ?? null;
      const mskFlare = msk.verified_rallying_flare ?? null;
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
