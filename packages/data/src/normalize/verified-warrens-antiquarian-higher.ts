import type { NormalizedHeroSkillCard, Segment } from "./schema";
import { normalizedHeroSkillCardSchema } from "./schema";
import { lineSignature } from "./verified-hero-layout";

type IconSegment = Extract<Segment, { type: "icon" }>;

function text(value: string): Segment {
  return { type: "text", text: value };
}

function iconFromPool(
  cards: readonly NormalizedHeroSkillCard[],
  key: string,
): IconSegment {
  for (const card of cards) {
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
    if (hit) return hit;
  }
  throw new Error(`缺少已确认图标 {${key}}（R-048）`);
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

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

function assertAntiquarian(
  card: NormalizedHeroSkillCard,
  page: number,
  name: string,
  level: number,
) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "ANTIQUARIAN" ||
    card.name !== name ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

/**
 * R-200：Antiquarian II–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 */
export function attachVerifiedWarrensAntiquarianHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const rangeIcon = iconFromPool(cards, "range");
  const healMarker = iconFromPool(cards, "damage_or_heal_combined_marker");

  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p302": {
        assertAntiquarian(card, 302, "Get Down!", 2);
        const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const expected = ["{range}{buff}Self", "{self_effects}{buff}Self{buff}3t,{shuffle}Push2"];
        if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
          throw new Error(`${card.id} Get Down II 效果行漂移（R-048）`);
        const selfEffects = iconFromCard(card, "self_effects");
        const buff = iconFromCard(card, "buff");
        const shuffle = iconFromCard(card, "shuffle");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            [rangeIcon, text(" Self")],
            [
              selfEffects,
              text(" Self "),
              buff,
              text(" 3t, "),
              shuffle,
              text(" Push 2"),
            ],
          ],
          unlabeled_numbers: [
            {
              text: "0",
              numeric: 0,
              anchor: {
                type: "beside_icon" as const,
                left_icon: rangeIcon.icon,
                inside_icon: null,
              },
            },
            ...card.unlabeled_numbers,
          ],
        });
      }
      case "hero_skill:p308":
      case "hero_skill:p309": {
        const page = card.id === "hero_skill:p308" ? 308 : 309;
        const critHeal = page === 308 ? 3 : 5;
        const accHeal = page === 308 ? 2 : 3;
        const debuffT = 3;
        assertAntiquarian(card, page, "Fortifying Vapours", page === 308 ? 2 : 3);
        const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
        const expectedStats =
          page === 308
            ? `{range}1{target_hero}Crit0{buff}{heal}${critHeal}Acc14{buff}{heal}${accHeal}`
            : `{range}1{target_hero}Crit1{buff}{heal}${critHeal}Acc16{buff}{heal}${accHeal}`;
        if (statsSig !== expectedStats)
          throw new Error(`${card.id} Fortifying stats_line 漂移（R-048）`);
        const healIcon = iconFromCard(card, "heal");
        const stats = card.stats_line!.map((segment) => {
          if (segment.type === "icon" && segment.icon.key === "buff")
            return cloneKey(healMarker, "damage_or_heal_combined_marker");
          return segment.type === "icon" && segment.icon.key === "heal"
            ? healIcon
            : segment;
        });
        const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const selfHeal = page === 308 ? 2 : 4;
        const expectedEff = [
          `{self_effects}{buff}Self{buff}{heal}${selfHeal},{stress}3t`,
          `{target_effects}{debuff}${debuffT}t`,
        ];
        if (JSON.stringify(rawSigs) !== JSON.stringify(expectedEff))
          throw new Error(`${card.id} Fortifying 效果行漂移（R-048）`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: stats,
        });
      }
      case "hero_skill:p311": {
        assertAntiquarian(card, 311, "Invigorating Vapours", 2);
        const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const expected = [
          "{range}0{target_hero}{target_hero}",
          "{self_effects}{buff}Self{buff}2t",
          "{target_effects}{debuff}3t",
        ];
        if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
          throw new Error(`${card.id} Invigorating II 效果行漂移（R-048）`);
        const selfEffects = iconFromCard(card, "self_effects");
        const buff = iconFromCard(card, "buff");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            card.effect_lines[0]!,
            [selfEffects, text(" Self "), buff, text(" 2t")],
            card.effect_lines[2]!,
          ],
        });
      }
      default:
        return card;
    }
  });
}
