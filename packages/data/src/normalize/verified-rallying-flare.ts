import type { NormalizedHeroSkillCard } from "./schema";

const CLEANUP_SIGNATURE =
  "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}";
const MONSTER_DEBUFF_SIGNATURE = "{target_monster} : {debuff} 2t";

const ENTRIES: readonly {
  readonly id: string;
  readonly level: number;
  readonly acc: number;
  readonly targetIcons: number;
}[] = [
  { id: "hero_skill:p166", level: 1, acc: 10, targetIcons: 2 },
  { id: "hero_skill:p167", level: 2, acc: 11, targetIcons: 3 },
  { id: "hero_skill:p168", level: 3, acc: 12, targetIcons: 4 },
];

function signature(
  line: readonly { type: string; text?: string; icon?: { key: string | null } }[],
) {
  return line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon!.key}}`))
    .join("")
    .split(String.fromCharCode(7))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rallying Flare I–III：逐卡复核混阵营目标与眩晕/标记清除行（R-103）。 */
export function attachVerifiedRallyingFlare(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const byId = new Map(ENTRIES.map((e) => [e.id, e]));
  return cards.map((card) => {
    const entry = byId.get(card.id);
    if (!entry) return card;
    const page = Number(card.id.slice(-3));
    const cleanup = card.effect_lines[0];
    const monster = card.effect_lines[1];
    const targetGlyphs = (card.front_icons ?? []).filter(
      (icon) => icon.key === "target_hero_or_monster",
    );
    const acc = card.printed_labels.find((l) => l.label === "Acc")?.value;
    if (
      card.name !== "Rallying Flare" ||
      card.level !== entry.level ||
      card.hero !== "ARBALEST" ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.effect_lines.length !== 2 ||
      acc !== entry.acc ||
      targetGlyphs.length !== entry.targetIcons ||
      !cleanup ||
      signature(cleanup) !== CLEANUP_SIGNATURE ||
      !monster ||
      signature(monster) !== MONSTER_DEBUFF_SIGNATURE ||
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
      verified_rallying_flare: {
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
