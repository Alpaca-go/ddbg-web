import type { NormalizedHeroSkillCard, Segment } from "./schema";

export function lineSignature(line: readonly Segment[]): string {
  return line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .split(String.fromCharCode(7))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** 完整印刷 p038–039 / p043：整理已核实的跨行效果框，不改原始转录。 */
export function attachVerifiedHeroLayout(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const reviewed: Record<number, string[]> = {
    38: [
      "{range} 0-1 {target_hero}",
      "{self_effects} Self Remove {bleed} {blight} , {target_effects} Remove {bleed} {blight} , {buff} 2t",
      "{buff} 2t",
    ],
    39: [
      "{range} 0-1 {target_hero} {target_hero}",
      "{self_effects} Self Remove {bleed}",
      "{target_effects} Remove {bleed} {blight} , {buff} 2t",
      "{blight} , {buff} 2t",
    ],
  };
  return cards.map((card) => {
    // FRONT p43：同一目标效果框跨两行，沿用该框实际标记，不改原始转录。
    if (card.id === "hero_skill:p043") {
      const signatures = card.effect_lines.map(lineSignature);
      if (
        card.hero !== "BOUNTY HUNTER" ||
        card.name !== "Collect Bounty" ||
        card.level !== 1 ||
        card.pages.length !== 1 ||
        card.pages[0] !== 43 ||
        card.verification.unverified ||
        signatures.length !== 2 ||
        signatures[0] !== "{target_effects} {damage} +1 vs Humans" ||
        !["{damage} +2 vs {mark}", "{target_effects} {damage} +2 vs {mark}"].includes(
          signatures[1]!,
        )
      )
        throw new Error("Collect Bounty I完整目标效果框漂移（R-048）");
      const marker = card.effect_lines[0]![0]!;
      if (
        marker.type !== "icon" ||
        marker.icon.key !== "target_effects" ||
        card.effect_lines
          .flat()
          .some(
            (s) =>
              s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
          )
      )
        throw new Error("Collect Bounty I目标框图标未确认（R-048）");
      return signatures[1]!.startsWith("{target_effects}")
        ? card
        : {
            ...card,
            effect_lines: [
              card.effect_lines[0]!,
              [marker, { type: "text" as const, text: " " }, ...card.effect_lines[1]!],
            ],
          };
    }
    const page = card.pages[0]!;
    const original = reviewed[page];
    if (!original || card.id !== `hero_skill:p0${page}`) return card;
    if (
      card.name !== "Adrenaline Rush" ||
      card.level !== page - 36 ||
      card.pages.length !== 1 ||
      card.verification.unverified ||
      card.stats_line !== null ||
      JSON.stringify(card.effect_lines.map(lineSignature)) !== JSON.stringify(original)
    )
      throw new Error(`${card.id} 已复核效果框布局漂移`);
    const icons = card.effect_lines.flat().filter((s) => s.type === "icon");
    if (icons.some((s) => !["confirmed", "confirmed_rulebook"].includes(s.icon.naming)))
      throw new Error(`${card.id} 效果框含未确认图标`);
    const line = (text: string): Segment[] =>
      text
        .split(/(\{[a-z_]+\})/)
        .filter(Boolean)
        .map((part) => {
          if (!part.startsWith("{")) return { type: "text", text: part };
          const segment = icons.find((s) => s.icon.key === part.slice(1, -1));
          if (!segment) throw new Error(`${card.id} 效果框缺少原图标 ${part}`);
          return segment;
        });
    return {
      ...card,
      stats_line: card.effect_lines[0]!,
      effect_lines: [
        line("{self_effects} Self Remove {bleed} {blight}, {buff} 2t"),
        line("{target_effects} Remove {bleed} {blight}, {buff} 2t"),
      ],
    };
  });
}
