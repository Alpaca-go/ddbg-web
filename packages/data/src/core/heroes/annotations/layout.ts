import type { NormalizedHeroSkillCard, Segment } from "../../../shared/schema";
import { lineSignature } from "./shared";
import type { LayoutEntry } from "./types";

function confirmedOnly(card: NormalizedHeroSkillCard): boolean {
  return !card.effect_lines
    .flat()
    .some((s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming));
}

/** 逐卡效果框布局 applier：只整理已核实的跨行框，不改原始转录。 */
export function applyLayouts(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly LayoutEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return cards.map((card) => {
    const entry = byId.get(card.id);
    if (!entry) return card;
    if (entry.kind === "strip-trailing-comma") {
      const [move, guard] = card.effect_lines;
      if (
        card.name !== entry.name ||
        card.level !== entry.level ||
        card.verification.unverified ||
        card.effect_lines.length !== 2 ||
        !move ||
        !guard ||
        lineSignature(move) !== entry.expected[0] ||
        lineSignature(guard) !== entry.expected[1]
      )
        throw new Error(`${card.id} 匕首刺卡面行漂移（R-048）`);
      return {
        ...card,
        effect_lines: [
          move.map((segment) =>
            segment.type === "text"
              ? { ...segment, text: segment.text.replace(/,\s*$/, "") }
              : segment,
          ),
          guard,
        ],
      };
    }
    if (entry.kind === "target-box") {
      const signatures = card.effect_lines.map(lineSignature);
      if (
        card.hero !== entry.hero ||
        card.name !== entry.name ||
        card.level !== 1 ||
        card.pages.length !== 1 ||
        card.pages[0] !== entry.page ||
        card.verification.unverified ||
        signatures.length !== 2 ||
        signatures[0] !== entry.first ||
        !entry.second.includes(signatures[1]!)
      )
        throw new Error(`${entry.label}完整目标效果框漂移（R-048）`);
      const marker = card.effect_lines[0]![0]!;
      if (marker.type !== "icon" || marker.icon.key !== "target_effects" || !confirmedOnly(card))
        throw new Error(`${entry.label}目标框图标未确认（R-048）`);
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
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      card.pages.length !== 1 ||
      card.pages[0] !== entry.page ||
      card.verification.unverified ||
      card.stats_line !== null ||
      JSON.stringify(card.effect_lines.map(lineSignature)) !== JSON.stringify(entry.expected)
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
      effect_lines: [line(entry.output[0]!), line(entry.output[1]!)],
    };
  });
}
