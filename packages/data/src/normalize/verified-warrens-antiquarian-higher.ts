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

function segmentOnCard(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
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

function fixGetDown(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  buffT: number,
  pushText: string,
  rawExpected: [string, string],
  rangeIcon: IconSegment,
) {
  assertAntiquarian(card, page, "Get Down!", level);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (JSON.stringify(rawSigs) !== JSON.stringify(rawExpected))
    throw new Error(`${card.id} Get Down 效果行漂移（R-048）`);
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
        text(` ${buffT}t, `),
        shuffle,
        text(` ${pushText}`),
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

/**
 * R-200 / Q-167～Q-171：Antiquarian II–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 */
export function attachVerifiedWarrensAntiquarianHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const rangeIcon = iconFromPool(cards, "range");
  const healMarker = iconFromPool(cards, "damage_or_heal_combined_marker");
  const targetHeroIcon = iconFromPool(cards, "target_hero");

  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p302":
        return fixGetDown(card, 302, 2, 3, "Push 2", ["{range}{buff}Self", "{self_effects}{buff}Self{buff}3t,{shuffle}Push2"], rangeIcon);
      case "hero_skill:p303":
        return fixGetDown(
          card,
          303,
          3,
          4,
          "Push 1 or Push 2",
          ["{range}{buff}Self", "{self_effects}{buff}Self{buff}4t,{shuffle}Push1orPush2"],
          rangeIcon,
        );
      case "hero_skill:p305": {
        assertAntiquarian(card, 305, "Flashpowder", 2);
        const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (raw !== "{target_effects}{bleed}1t,{buff}2t")
          throw new Error(`${card.id} Flashpowder II 效果行漂移（R-048）`);
        const line = card.effect_lines[0]!;
        const misStun = line.find((s) => s.type === "icon" && s.icon.key === "bleed");
        const misDebuff = line.find((s) => s.type === "icon" && s.icon.key === "buff");
        if (misStun?.type !== "icon" || misDebuff?.type !== "icon")
          throw new Error(`${card.id} Flashpowder II 状态段漂移`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [
              iconFromCard(card, "target_effects"),
              text(" "),
              cloneKey(misStun, "stun"),
              text(" 1t, "),
              cloneKey(misDebuff, "debuff"),
              text(" 2t"),
            ],
          ],
        });
      }
      case "hero_skill:p306": {
        assertAntiquarian(card, 306, "Flashpowder", 3);
        const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (raw !== "{target_effects}{target_effects}2t,{buff}2t")
          throw new Error(`${card.id} Flashpowder III 效果行漂移（R-048）`);
        const line = card.effect_lines[0]!;
        const dupes = line.filter(
          (s): s is IconSegment => s.type === "icon" && s.icon.key === "target_effects",
        );
        const misDebuff = line.find((s) => s.type === "icon" && s.icon.key === "buff");
        if (dupes.length < 1 || misDebuff?.type !== "icon")
          throw new Error(`${card.id} Flashpowder III 行漂移`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [
              iconFromCard(card, "target_effects"),
              text(" "),
              cloneKey(dupes[0]!, "stun"),
              text(" 2t, "),
              cloneKey(misDebuff, "debuff"),
              text(" 2t"),
            ],
          ],
        });
      }
      case "hero_skill:p308":
      case "hero_skill:p309": {
        const page = card.id === "hero_skill:p308" ? 308 : 309;
        const selfHeal = page === 308 ? 2 : 4;
        const buffT = page === 308 ? 3 : 3;
        assertAntiquarian(card, page, "Fortifying Vapours", page === 308 ? 2 : 3);
        const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
        const expectedStats =
          page === 308
            ? "{range}1{target_hero}Crit0{buff}{heal}3Acc14{buff}{heal}2"
            : "{range}1{target_hero}Crit1{buff}{heal}5Acc16{buff}{heal}3";
        if (statsSig !== expectedStats)
          throw new Error(`${card.id} Fortifying stats_line 漂移（R-048）`);
        const healIcon = iconFromCard(card, "heal");
        const stats = card.stats_line!.map((segment) => {
          if (segment.type === "icon" && segment.icon.key === "buff")
            return cloneKey(healMarker, "damage_or_heal_combined_marker");
          return segment.type === "icon" && segment.icon.key === "heal" ? healIcon : segment;
        });
        const selfEffects = iconFromCard(card, "self_effects");
        const buff = iconFromCard(card, "buff");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: stats,
          effect_lines: [
            [selfEffects, text(" Self "), healIcon, text(` ${selfHeal}`)],
            [selfEffects, text(" Self "), buff, text(` ${buffT}t`)],
          ],
          unlabeled_numbers: [
            ...card.unlabeled_numbers,
            {
              text: String(selfHeal),
              numeric: selfHeal,
              anchor: {
                type: "beside_icon" as const,
                left_icon: null,
                inside_icon: healIcon.icon,
              },
            },
          ],
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
        const buff = iconFromCard(card, "buff");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            [rangeIcon, text(" 0 "), targetHeroIcon, text(" "), targetHeroIcon],
            [iconFromCard(card, "target_effects"), text(" "), buff, text(" 2t")],
          ],
        });
      }
      case "hero_skill:p312": {
        assertAntiquarian(card, 312, "Invigorating Vapours", 3);
        const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const expected = [
          "{range}0{target_hero_or_monster}{target_hero_or_monster}{target_hero_or_monster}",
          "{self_effects}{buff}Self{buff}3t",
          "{target_effects}{debuff}4t",
        ];
        if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
          throw new Error(`${card.id} Invigorating III 效果行漂移（R-048）`);
        const buff = iconFromCard(card, "buff");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            [rangeIcon, text(" 0 "), targetHeroIcon, text(" "), targetHeroIcon, text(" "), targetHeroIcon],
            [iconFromCard(card, "target_effects"), text(" "), buff, text(" 4t")],
          ],
        });
      }
      case "hero_skill:p314": {
        assertAntiquarian(card, 314, "Protect Me", 2);
        const raw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
        if (raw !== "{light}{shuffle}3t,{damage}2t,{mark}2t")
          throw new Error(`${card.id} Protect Me II 效果行漂移（R-048）`);
        const mark = iconFromCard(card, "mark");
        const lightMis = segmentOnCard(card, "9ffbd6087a");
        const dmgMis = segmentOnCard(card, "8d4bbe5e11");
        const targetEffects = iconFromCard(card, "target_effects");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            card.effect_lines[0]!,
            [
              targetEffects,
              text(" "),
              cloneKey(lightMis, "guard"),
              text(" 3t, "),
              cloneKey(dmgMis, "protection"),
              text(" 2t, "),
              mark,
              text(" 2t"),
            ],
          ],
        });
      }
      case "hero_skill:p315": {
        assertAntiquarian(card, 315, "Protect Me", 3);
        const raw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
        if (raw !== "{light}{target_effects}3t,{target_effects}3t,{stress}1t")
          throw new Error(`${card.id} Protect Me III 效果行漂移（R-048）`);
        const targets = card.effect_lines[1]!.filter(
          (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
        );
        if (targets.length < 2)
          throw new Error(`${card.id} Protect Me III 目标效果段漂移（R-048）`);
        const lightMis = segmentOnCard(card, "9ffbd6087a");
        const markMis = segmentOnCard(card, "9d58d3d431");
        const targetEffects = iconFromCard(card, "target_effects");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            card.effect_lines[0]!,
            [
              targetEffects,
              text(" "),
              cloneKey(lightMis, "guard"),
              text(" 3t, "),
              cloneKey(targets[0]!, "protection"),
              text(" 3t, "),
              cloneKey(markMis, "mark"),
              text(" 1t"),
            ],
          ],
        });
      }
      default:
        return card;
    }
  });
}
