import type { NormalizedHeroSkillCard, Segment } from "../schema";
import { legacyHeroSkillId } from "../../hero-registry";
import type { DamageEntry } from "./types";

const signature = (line: readonly Segment[]) =>
  line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s+/g, "");

/** 四核心完整印刷逐页核对：只录已命名伤害图标和明文条件。 */
export function applyDamage(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly DamageEntry[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    const legacyId = legacyHeroSkillId(card);
    if (legacyId === "hero_skill:p043" || legacyId === "hero_skill:p181") {
      const dual =
        legacyId === "hero_skill:p043"
          ? {
              hero: "BOUNTY HUNTER",
              name: "Collect Bounty",
              page: 43,
              lines: ["{target_effects}{damage}+1vsHumans", "{target_effects}{damage}+2vs{mark}"],
              stats: "{range}0{target_monster}Crit1{damage}10Acc9{damage}6",
              bonuses: [
                {
                  lineIndex: 0,
                  amount: 1,
                  condition: "human" as const,
                  source: "print_front" as const,
                },
                {
                  lineIndex: 1,
                  amount: 2,
                  condition: "marked" as const,
                  source: "print_front" as const,
                },
              ],
              label: "Collect Bounty I",
            }
          : {
              hero: "GRAVE ROBBER",
              name: "Throw Dagger",
              page: 181,
              lines: ["{target_effects}{damage}+1vs{blight}", "{target_effects}{damage}+2vs{mark}"],
              stats: "{range}1-2{target_monster}Crit2{damage}7Acc9{damage}4",
              bonuses: [
                {
                  lineIndex: 0,
                  amount: 1,
                  condition: "blighted" as const,
                  source: "print_front" as const,
                },
                {
                  lineIndex: 1,
                  amount: 2,
                  condition: "marked" as const,
                  source: "print_front" as const,
                },
              ],
              label: "Throw Dagger I",
            };
      if (
        card.hero !== dual.hero ||
        card.name !== dual.name ||
        card.back_name !== dual.name ||
        card.level !== 1 ||
        card.back_level !== 1 ||
        card.pages.length !== 1 ||
        card.pages[0] !== dual.page ||
        card.copies !== 1 ||
        card.verification.unverified ||
        JSON.stringify(card.effect_lines.map(signature)) !== JSON.stringify(dual.lines) ||
        !card.stats_line ||
        signature([...card.stats_line]) !== dual.stats ||
        card.effect_lines
          .flat()
          .some(
            (s) =>
              s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
          )
      )
        throw new Error(`${dual.label}完整伤害字段漂移（R-048）`);
      return { ...card, verified_damage_bonuses: dual.bonuses };
    }
    const entry = entries.find((e) => e.id === legacyId);
    if (!entry) return card;
    const line = card.effect_lines[entry.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== entry.name ||
      (legacyId === "hero_skill:p058" &&
        (card.hero !== "BOUNTY HUNTER" ||
          card.back_name !== entry.name ||
          card.back_level !== 1 ||
          card.copies !== 1 ||
          card.effect_lines.length !== 1)) ||
      (legacyId === "hero_skill:p172" &&
        (card.hero !== "GRAVE ROBBER" ||
          card.back_name !== entry.name ||
          card.back_level !== 1 ||
          card.copies !== 1 ||
          card.effect_lines.length !== 2)) ||
      ((legacyId === "hero_skill:p190" || legacyId === "hero_skill:p193") &&
        (card.hero !== "OCCULTIST" ||
          card.back_name !== entry.name ||
          card.back_level !== 1 ||
          card.copies !== 1 ||
          card.effect_lines.length !== 1)) ||
      card.level !== entry.level ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== entry.page ||
      text !== `{target_effects}{damage}+${entry.amount}vs${entry.suffix}` ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error(`${card.id} 已复核条件伤害与印刷数据不匹配`);
    return {
      ...card,
      verified_damage_bonus: {
        lineIndex: entry.lineIndex,
        amount: entry.amount,
        condition: entry.condition,
        source: "print_front",
      },
    };
  });
}
