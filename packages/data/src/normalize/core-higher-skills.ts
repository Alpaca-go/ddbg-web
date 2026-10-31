import rows from "./core-higher-skill-annotations.json";
import { normalizedHeroSkillCardSchema } from "./schema";
import type { NormalizedHeroSkillCard } from "./schema";
import { lineSignature } from "./verified-hero-layout";

/** R19–21: explicit printed values only; R-089's card-specific correction is excluded. */
export function attachCoreHigherSkills(cards: readonly NormalizedHeroSkillCard[]) {
  return cards.map((card) => {
    const row = rows.find((r) => r.id === card.id);
    if (!row) return card;
    if (
      card.name !== row.name ||
      card.level !== row.level ||
      card.verification.unverified ||
      JSON.stringify(card.effect_lines.map(lineSignature)) !== JSON.stringify(row.original) ||
      card.effect_lines
        .flat()
        .some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        )
    )
      throw new Error(`${card.id}: higher skill transcription changed (R-048)`);
    const effect_lines = card.effect_lines.map((line, i) => {
      if (row.lines[i] === row.original[i]) return line;
      if (row.lines[i] === row.original[i]!.replace(/,$/, ""))
        return line.map((s) =>
          s.type === "text" ? { ...s, text: s.text.replace(/,\s*$/, "") } : s,
        );
      return [card.effect_lines[0]![0]!, { type: "text" as const, text: " " }, ...line];
    });
    return normalizedHeroSkillCardSchema.parse({ ...card, ...row.flags, effect_lines });
  });
}
