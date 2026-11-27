import { HERO_PRINT_SOURCES } from "./print-sources";
import { hasPrintIconMeaning, printIcon } from "../../../shared/print-icons";
import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard, Segment } from "../../../shared/schema";
import type { HeroName } from "../hero-registry";
import { lineSignature } from "./shared";
import type {
  CorrectionIcon,
  HeroAnnotationEntries,
  HeroAnnotationModule,
  NumberCorrection,
  SkillCorrection,
} from "./types";

type IconSegment = Extract<Segment, { type: "icon" }>;

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

function iconFromCard(card: NormalizedHeroSkillCard, key: string): IconSegment {
  const pools = [
    ...(card.stats_line ?? []),
    ...card.effect_lines.flat(),
    ...card.front_icons.map((icon) => ({ type: "icon" as const, icon })),
  ];
  const hit = pools.find(
    (s): s is IconSegment =>
      s.type === "icon" &&
      s.icon.key === key &&
      ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
  );
  if (!hit) throw new Error(`${card.id} 缺少已确认图标 {${key}}（R-048）`);
  return hit;
}

/** 在 effect_lines 与 stats_line 里找指定 iconId 的印刷段。 */
function segmentOnCard(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  for (const line of [...card.effect_lines, ...(card.stats_line ? [card.stats_line] : [])]) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

/** 在 stats_line、effect_lines、front_icons 里找指定 iconId 的印刷段（搜索面最广）。 */
function segmentOnCardAll(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  const pools = [
    ...(card.stats_line ?? []),
    ...card.effect_lines.flat(),
    ...card.front_icons.map((icon) => ({ type: "icon" as const, icon })),
  ];
  for (const segment of pools) {
    if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

/** 只在 effect_lines 里找指定 iconId 的印刷段。 */
function segmentOnCardInEffects(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  for (const line of card.effect_lines) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}
/** 统一的逐卡元数据断言：英雄 / 卡名 / 等级 / 单页 / 页码 / 验证状态。 */
function assertCardMeta(
  card: NormalizedHeroSkillCard,
  hero: HeroName,
  page: number,
  name: string,
  level: number,
): void {
  if (
    card.hero !== hero ||
    card.name !== name ||
    card.level !== level ||
    card.pages.length !== 1 ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

function correctionIcon(
  ref: CorrectionIcon,
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
): IconSegment {
  let icon: IconSegment;
  if ("line" in ref) {
    const line = ref.line === "stats" ? card.stats_line : card.effect_lines[ref.line];
    const segment = line?.[ref.segment];
    if (
      segment?.type !== "icon" ||
      ("expectKey" in ref
        ? segment.icon.key !== ref.expectKey ||
          (ref.variantRank === undefined
            ? !["confirmed", "confirmed_rulebook"].includes(segment.icon.naming) ||
              !hasPrintIconMeaning(segment.icon.iconId, ref.expectKey)
            : segment.icon.iconId !== printIcon(ref.expectKey, ref.variantRank))
        : segment.icon.iconId !== ref.iconId)
    )
      throw new Error(
        card.id +
          " 印刷行图标漂移：" +
          ("expectKey" in ref ? ref.expectKey : ref.iconId) +
          "（R-048）",
      );
    icon = segment;
  } else if ("sourceIcon" in ref) {
    const source = HERO_PRINT_SOURCES[ref.sourceIcon];
    const matches = pool.filter((candidate) => candidate.id === source.sourceCardId);
    if (matches.length !== 1) throw new Error(source.sourceCardId + " 图标来源必须唯一（R-048）");
    icon = correctionIcon({ ...source, expectKey: ref.sourceIcon }, matches[0]!, pool);
  } else if ("icon" in ref) {
    icon = iconFromCard(card, ref.icon);
  } else if (ref.from === "effects") {
    icon = segmentOnCardInEffects(card, ref.iconId);
  } else if (ref.from === "lines") {
    icon = segmentOnCard(card, ref.iconId);
  } else {
    icon = segmentOnCardAll(card, ref.iconId);
  }
  return ref.relabelAs === undefined ? icon : cloneKey(icon, ref.relabelAs);
}

function correctNumbers(
  numbers: NormalizedHeroSkillCard["unlabeled_numbers"],
  correction: NumberCorrection,
  resolve: (ref: CorrectionIcon) => IconSegment,
): NormalizedHeroSkillCard["unlabeled_numbers"] {
  const anchor = (entry: NonNullable<NumberCorrection["append"]>[number]) => ({
    text: entry.text,
    numeric: entry.numeric,
    anchor: {
      type: "beside_icon" as const,
      left_icon: entry.left ? resolve(entry.left).icon : null,
      inside_icon: entry.inside ? resolve(entry.inside).icon : null,
    },
  });
  const kept = numbers.filter((number) => {
    const { anchor } = number;
    return !correction.remove?.some((match) => {
      if (match.text !== undefined && number.text !== match.text) return false;
      if (match.numeric !== undefined && number.numeric !== match.numeric) return false;
      if (match.beside && anchor.type !== "beside_icon") return false;
      if (
        match.leftKeys &&
        (anchor.type !== "beside_icon" || !match.leftKeys.includes(anchor.left_icon?.key ?? ""))
      )
        return false;
      if (match.insideId === undefined) return true;
      if (anchor.type !== "beside_icon") return false;
      return match.insideId === null
        ? anchor.inside_icon === null
        : anchor.inside_icon?.iconId === match.insideId;
    });
  });
  const replace = correction.replaceLeft;
  return [
    ...(correction.prepend ?? []).map(anchor),
    ...kept.map((number) =>
      replace && number.text === replace.text && number.anchor.type === "beside_icon"
        ? { ...number, anchor: { ...number.anchor, left_icon: resolve(replace.icon).icon } }
        : number,
    ),
    ...(correction.append ?? []).map(anchor),
  ];
}

function applyCorrection(
  card: NormalizedHeroSkillCard,
  entry: SkillCorrection,
  hero: HeroName,
  pool: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard {
  assertCardMeta(card, hero, entry.page, entry.name, entry.level);
  const signature = (line: readonly Segment[]) => lineSignature(line).replace(/\s+/g, "");
  if (
    JSON.stringify(card.effect_lines.map(signature)) !== JSON.stringify(entry.expectedEffects) ||
    (card.stats_line ? signature(card.stats_line) : null) !== entry.expectedStats ||
    (entry.expectedLabels &&
      JSON.stringify(card.printed_labels) !== JSON.stringify(entry.expectedLabels))
  )
    throw new Error(`${card.id} ${entry.name} 印刷数据漂移（R-048）`);

  const icon = (ref: CorrectionIcon) => correctionIcon(ref, card, pool);
  for (const ref of entry.requireIcons ?? []) icon(ref);
  const line = (segments: readonly (string | CorrectionIcon)[]): Segment[] =>
    segments.map((segment) =>
      typeof segment === "string" ? { type: "text", text: segment } : icon(segment),
    );
  return parseAnnotatedHeroSkillCard({
    ...card,
    ...(entry.effects
      ? {
          effect_lines: entry.effects.map((effect) =>
            typeof effect === "number" ? card.effect_lines[effect]! : line(effect),
          ),
        }
      : {}),
    ...(entry.stats === undefined
      ? {}
      : { stats_line: entry.stats === null ? null : line(entry.stats) }),
    ...(entry.numbers
      ? { unlabeled_numbers: correctNumbers(card.unlabeled_numbers, entry.numbers, icon) }
      : {}),
    ...entry.annotations,
  });
}

/** 一个英雄一个模块，修正数据按 canonical ID 在原逐卡审校阶段应用。 */
export function defineHeroModule(config: {
  readonly id: `h${number}`;
  readonly hero: HeroName;
  readonly entries: HeroAnnotationEntries;
  readonly fixes: readonly SkillCorrection[] | null;
}): HeroAnnotationModule {
  const { id, hero, entries, fixes } = config;
  const byId = new Map(fixes?.map((entry) => [entry.id, entry]));
  if (byId.size !== (fixes?.length ?? 0)) throw new Error(`${id} 技能修正 ID 重复（R-048）`);
  return {
    id,
    hero,
    entries,
    apply(cards) {
      for (const id of byId.keys()) {
        if (cards.filter((card) => card.id === id).length !== 1)
          throw new Error(`${id} 注解必须唯一命中一张卡（R-048）`);
      }
      return cards.map((card) => {
        const entry = byId.get(card.id);
        return entry ? applyCorrection(card, entry, hero, cards) : card;
      });
    },
  };
}
