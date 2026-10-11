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

/** 完整印刷 p038–039：提取器按 y 混合左右框；只整理这两张的已确认原片段。 */
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
