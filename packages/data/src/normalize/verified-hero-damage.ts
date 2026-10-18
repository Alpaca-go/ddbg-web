import type { NormalizedHeroSkillCard } from "./schema";

/** 四核心完整印刷逐页核对：只录已命名伤害图标和明文条件。 */
export function attachVerifiedHeroDamage(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    if (card.id === "hero_skill:p043" || card.id === "hero_skill:p181") {
      const signature = (line: (typeof card.effect_lines)[number]) =>
        line
          .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
          .join("")
          .replace(/\s+/g, "");
      const dual =
        card.id === "hero_skill:p043"
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
        signature(card.stats_line) !== dual.stats ||
        card.effect_lines
          .flat()
          .some(
            (s) =>
              s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
          )
      )
        throw new Error(`${dual.label}完整伤害字段漂移（R-048）`);
      return {
        ...card,
        verified_damage_bonuses: dual.bonuses,
      };
    }
    const reviewed = {
      "hero_skill:p001": {
        name: "Smite",
        level: 1,
        page: 1,
        lineIndex: 0,
        amount: 1,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p002": {
        name: "Smite",
        level: 2,
        page: 2,
        lineIndex: 0,
        amount: 2,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p003": {
        name: "Smite",
        level: 3,
        page: 3,
        lineIndex: 0,
        amount: 3,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p016": {
        name: "Holy Lance",
        level: 1,
        page: 16,
        lineIndex: 1,
        amount: 1,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p017": {
        name: "Holy Lance",
        level: 2,
        page: 17,
        lineIndex: 1,
        amount: 2,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p018": {
        name: "Holy Lance",
        level: 3,
        page: 18,
        lineIndex: 1,
        amount: 3,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p067": {
        name: "Pistol Shot",
        level: 1,
        page: 67,
        lineIndex: 0,
        amount: 2,
        condition: "marked",
        suffix: "{mark}",
      },
      "hero_skill:p058": {
        name: "Finish Him",
        level: 1,
        page: 58,
        lineIndex: 0,
        amount: 2,
        condition: "stunned",
        suffix: "{stun}",
      },
      "hero_skill:p172": {
        name: "Lunge",
        level: 1,
        page: 172,
        lineIndex: 1,
        amount: 2,
        condition: "blighted",
        suffix: "{blight}",
      },
      "hero_skill:p190": {
        name: "Sacrificial Stab",
        level: 1,
        page: 190,
        lineIndex: 0,
        amount: 1,
        condition: "eldritch",
        suffix: "Eldritch",
      },
      "hero_skill:p193": {
        name: "Abyssal Artillery",
        level: 1,
        page: 193,
        lineIndex: 0,
        amount: 1,
        condition: "eldritch",
        suffix: "Eldritch",
      },
      "hero_skill:p068": {
        name: "Pistol Shot",
        level: 2,
        page: 68,
        lineIndex: 0,
        amount: 3,
        condition: "marked",
        suffix: "{mark}",
      },
      "hero_skill:p069": {
        name: "Pistol Shot",
        level: 3,
        page: 69,
        lineIndex: 0,
        amount: 4,
        condition: "marked",
        suffix: "{mark}",
      },
      "hero_skill:p085": {
        name: "Mace Bash",
        level: 1,
        page: 85,
        lineIndex: 0,
        amount: 1,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p086": {
        name: "Mace Bash",
        level: 2,
        page: 86,
        lineIndex: 0,
        amount: 2,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p087": {
        name: "Mace Bash",
        level: 3,
        page: 87,
        lineIndex: 0,
        amount: 3,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p103": {
        name: "Hand of Light",
        level: 1,
        page: 103,
        lineIndex: 1,
        amount: 1,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p104": {
        name: "Hand of Light",
        level: 2,
        page: 104,
        lineIndex: 1,
        amount: 2,
        condition: "unholy",
        suffix: "Unholy",
      },
      "hero_skill:p105": {
        name: "Hand of Light",
        level: 3,
        page: 105,
        lineIndex: 1,
        amount: 3,
        condition: "unholy",
        suffix: "Unholy",
      },
    } as const;
    const entry = reviewed[card.id as keyof typeof reviewed];
    if (!entry) return card;
    const line = card.effect_lines[entry.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== entry.name ||
      (card.id === "hero_skill:p058" &&
        (card.hero !== "BOUNTY HUNTER" ||
          card.back_name !== entry.name ||
          card.back_level !== 1 ||
          card.copies !== 1 ||
          card.effect_lines.length !== 1)) ||
      (card.id === "hero_skill:p172" &&
        (card.hero !== "GRAVE ROBBER" ||
          card.back_name !== entry.name ||
          card.back_level !== 1 ||
          card.copies !== 1 ||
          card.effect_lines.length !== 2)) ||
      ((card.id === "hero_skill:p190" || card.id === "hero_skill:p193") &&
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
