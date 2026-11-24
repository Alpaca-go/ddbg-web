import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { heroSkillId } from "../hero-registry";
import type { TargetCountEntry } from "./types";

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

export type TargetCounts = {
  readonly hero: number;
  readonly monster: number;
  readonly heroOrMonster: number;
};

function countsOfIcons(
  icons: readonly { readonly key: string | null; readonly naming: string }[],
): TargetCounts {
  let hero = 0;
  let monster = 0;
  let heroOrMonster = 0;
  for (const icon of icons) {
    if (!NAMED.has(icon.naming) || icon.key === null) continue;
    if (icon.key === "target_hero") hero += 1;
    if (icon.key === "target_monster") monster += 1;
    if (icon.key === "target_hero_or_monster") heroOrMonster += 1;
  }
  return { hero, monster, heroOrMonster };
}

function lineIcons(
  line: NormalizedHeroSkillCard["effect_lines"][number],
): { key: string | null; naming: string }[] {
  const icons: { key: string | null; naming: string }[] = [];
  for (const segment of line) if (segment.type === "icon") icons.push(segment.icon);
  return icons;
}

/**
 * 与引擎 `readTargetIconCounts` 的非特殊分支一致：
 * stats 行优先；效果行已有英雄/怪物目标图标时不改用正面图标；都没有时读 front_icons。
 * 目标框（`annotation_target_header`）、Rallying Flare、支援卡不在这里重复计算。
 */
export function expectedTargetCounts(card: NormalizedHeroSkillCard): TargetCounts {
  if (
    card.rules?.target?.header !== undefined ||
    card.rules?.rallyingFlare !== undefined ||
    card.rules?.target?.support !== undefined
  )
    throw new Error(`${card.id} 目标计数不覆盖特殊目标卡（R-048）`);
  const stats = countsOfIcons(lineIcons(card.stats_line ?? []));
  if (stats.hero > 0 || stats.monster > 0 || stats.heroOrMonster > 0) return stats;
  const effectHasHeroMonster = card.effect_lines.some((line) =>
    lineIcons(line).some(
      (icon) =>
        NAMED.has(icon.naming) && (icon.key === "target_hero" || icon.key === "target_monster"),
    ),
  );
  if (effectHasHeroMonster) return { hero: 0, monster: 0, heroOrMonster: 0 };
  return countsOfIcons(card.front_icons ?? []);
}

/**
 * 区域目标数 applier：
 * 把 A0.5 已核的目标图标个数冻结成 `rules.targets`，并在构建时和当前已确认图标对表；
 * 图标漂移会让构建失败，要求重新审阅，而不是静默改规则。
 */
export function applyTargetCounts(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly TargetCountEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map<string, TargetCountEntry>();
  for (const entry of entries) byId.set(entry.id, entry);
  return cards.map((card) => {
    if (card.rules?.targets) return card;
    const page = card.pages[0]!;
    const hero = card.hero ?? "ABOMINATION";
    const globalPage = card.id.startsWith("hero_skill:musketeer:") ? 357 + page : page;
    const entry = byId.get(heroSkillId(hero, globalPage));
    if (!entry) return card;
    if (card.verification.unverified) throw new Error(`${card.id} 目标计数来自未验证卡（R-048）`);
    const expected = expectedTargetCounts(card);
    if (
      entry.hero !== expected.hero ||
      entry.monster !== expected.monster ||
      entry.heroOrMonster !== expected.heroOrMonster
    )
      throw new Error(`${card.id} 目标计数与已确认图标不符（R-048）`);
    const rules = {
      ...(card.rules ?? {}),
      targets: {
        hero: entry.hero,
        monster: entry.monster,
        heroOrMonster: entry.heroOrMonster,
      },
    };
    return parseAnnotatedHeroSkillCard({ ...card, rules });
  });
}
