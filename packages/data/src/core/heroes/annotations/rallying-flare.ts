import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { lineSignature } from "./shared";
import type { RallyingFlareEntry } from "./types";

const CLEANUP_SIGNATURE =
  "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}";
const MONSTER_DEBUFF_SIGNATURE = "{target_monster} : {debuff} 2t";

/** Rallying Flare / Skeet Shot I–III：逐卡复核混阵营目标与眩晕/标记清除行（R-103）。 */
export function applyRallyingFlare(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly RallyingFlareEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return cards.map((card) => {
    if (card.rules?.rallyingFlare) return card;
    const entry = byId.get(card.id);
    if (!entry) return card;
    const page = card.pages[0]!;
    const cleanup = card.effect_lines[0];
    const monster = card.effect_lines[1];
    const targetGlyphs = (card.front_icons ?? []).filter(
      (icon) => icon.key === "target_hero_or_monster",
    );
    const acc = card.printed_labels.find((l) => l.label === "Acc")?.value;
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      card.hero !== entry.hero ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.effect_lines.length !== 2 ||
      acc !== entry.acc ||
      targetGlyphs.length !== entry.targetIcons ||
      !cleanup ||
      lineSignature(cleanup) !== CLEANUP_SIGNATURE ||
      !monster ||
      lineSignature(monster) !== MONSTER_DEBUFF_SIGNATURE ||
      cleanup.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      monster.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      targetGlyphs.some((icon) => !["confirmed", "confirmed_rulebook"].includes(icon.naming))
    )
      throw new Error(`${card.id} Rallying Flare 复核与印刷数据不匹配`);
    return {
      ...card,
      annotation_rallying_flare: {
        cleanupLineIndex: 0,
        cleanupSignature: CLEANUP_SIGNATURE,
        monsterDebuffLineIndex: 1,
        monsterDebuffSignature: MONSTER_DEBUFF_SIGNATURE,
        debuffDuration: 2,
        source: "print_front",
      },
    };
  });
}
