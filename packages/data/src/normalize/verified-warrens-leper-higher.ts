import type { NormalizedHeroSkillCard, Segment } from "./schema";
import { normalizedHeroSkillCardSchema } from "./schema";
import { lineSignature } from "./verified-hero-layout";

type IconSegment = Extract<Segment, { type: "icon" }>;

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

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
  for (const line of card.effect_lines) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

function assertLeper(card: NormalizedHeroSkillCard, page: number, name: string, level: number) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "LEPER" ||
    card.name !== name ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

/**
 * R-200 / Q-163～Q-166：Leper II–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 */
export function attachVerifiedWarrensLeperHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const rangeIcon = iconFromPool(cards, "range");
  const stressIcon = iconFromPool(cards, "stress");
  const targetEffectsIcon = iconFromPool(cards, "target_effects");

  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p281":
      case "hero_skill:p282": {
        const page = card.id === "hero_skill:p281" ? 281 : 282;
        assertLeper(card, page, "Purge", page === 281 ? 2 : 3);
        const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (rawSig !== "{self_effects}{buff}Self{buff}2t")
          throw new Error(`${card.id} Purge Buff 行漂移（R-048）`);
        const buff = iconFromCard(card, "buff");
        const selfEffects = iconFromCard(card, "self_effects");
        const base = {
          ...card,
          effect_lines: [
            [selfEffects, text(" Self "), buff, text(" 2t")],
            card.effect_lines[1]!,
          ],
        };
        if (card.id === "hero_skill:p281") {
          return normalizedHeroSkillCardSchema.parse(base);
        }
        const stats = card.stats_line;
        const statsSig = stats ? lineSignature(stats).replace(/\s+/g, "") : "";
        if (statsSig !== "{range}0{target_monster}Crit0{heal}19Acc11{heal}12")
          throw new Error(`${card.id} Purge III stats_line 漂移（R-048）`);
        return normalizedHeroSkillCardSchema.parse({
          ...base,
          stats_line: stats!.map((segment) =>
            segment.type === "icon" && segment.icon.key === "heal"
              ? cloneKey(segment, "damage")
              : segment,
          ),
        });
      }
      case "hero_skill:p284":
      case "hero_skill:p285": {
        const page = card.id === "hero_skill:p284" ? 284 : 285;
        const markT = page === 284 ? 2 : 3;
        assertLeper(card, page, "Revenge", page === 284 ? 2 : 3);
        const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (rawSig !== `{heal}{mark}${markT}t,{debuff}${markT}t`)
          throw new Error(`${card.id} Revenge 效果行漂移（R-048）`);
        const line = card.effect_lines[0]!;
        const leadHeal = line[0];
        if (leadHeal?.type !== "icon" || leadHeal.icon.iconId !== "20ffe98e2d")
          throw new Error(`${card.id} Revenge 行首误 heal 段漂移（R-048）`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [
              cloneKey(leadHeal, "target_effects"),
              ...line.slice(1),
            ],
          ],
        });
      }
      case "hero_skill:p287":
      case "hero_skill:p288": {
        const page = card.id === "hero_skill:p287" ? 287 : 288;
        const protT = page === 287 ? 2 : 3;
        assertLeper(card, page, "Withstand", page === 287 ? 2 : 3);
        const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (rawSig !== `{self_effects}{buff}Self{protection}${protT}t,{mark}1t`)
          throw new Error(`${card.id} Withstand 效果行漂移（R-048）`);
        const selfEffects = iconFromCard(card, "self_effects");
        const protection = iconFromCard(card, "protection");
        const mark = iconFromCard(card, "mark");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          effect_lines: [
            [rangeIcon, text(" Self")],
            [
              selfEffects,
              text(" Self "),
              protection,
              text(` ${protT}t, `),
              mark,
              text(" 1t"),
            ],
          ],
        });
      }
      case "hero_skill:p290":
      case "hero_skill:p291": {
        const page = card.id === "hero_skill:p290" ? 290 : 291;
        const heal = page === 290 ? 9 : 12;
        assertLeper(card, page, "Solemnity", page === 290 ? 2 : 3);
        const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        const expected =
          page === 290
            ? "{self_effects}{buff}Self{buff}{heal}9,{shuffle}-1"
            : "{self_effects}{buff}Self{buff}12{heal},{shuffle}-1";
        if (raw !== expected) throw new Error(`${card.id} Solemnity 效果行漂移（R-048）`);
        const selfEffects = iconFromCard(card, "self_effects");
        const healIcon = iconFromCard(card, "heal");
        const shuffleMisread = segmentOnCard(card, "f18923574c");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: [rangeIcon, text(" Self")],
          effect_lines: [
            [
              selfEffects,
              text(" Self "),
              healIcon,
              text(` ${heal}`),
              cloneKey(shuffleMisread, "stress"),
              text("-1"),
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
            ...card.unlabeled_numbers.map((item) => {
              if (item.text !== "-1" || item.anchor.type !== "beside_icon") return item;
              return {
                ...item,
                anchor: {
                  type: "beside_icon" as const,
                  left_icon: { ...stressIcon.icon },
                  inside_icon: item.anchor.inside_icon,
                },
              };
            }),
          ],
        });
      }
      case "hero_skill:p293":
      case "hero_skill:p294": {
        const page = card.id === "hero_skill:p293" ? 293 : 294;
        const markT = page === 293 ? 2 : 1;
        const debuffT = page === 293 ? 2 : 3;
        assertLeper(card, page, "Intimidate", page === 293 ? 2 : 3);
        const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const expected = [
          `{self_effects}{buff}Self{buff}${markT}t`,
          `{light}Ignores{target_effects}{target_effects},{debuff}${debuffT}t`,
        ];
        if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
          throw new Error(`${card.id} Intimidate 效果行漂移（R-048）`);
        const selfEffects = iconFromCard(card, "self_effects");
        const markMisread = segmentOnCard(card, "d4329c2a97");
        const targetDupes = card.effect_lines[1]!.filter(
          (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
        );
        if (targetDupes.length < 2)
          throw new Error(`${card.id} Intimidate Ignores 行 target_effects 漂移（R-048）`);
        const debuff = iconFromCard(card, "debuff");
        // 印刷签名闸仍用提取键 `{light}`（9ffbd6087a）；折角箭头非光照，不入结算段（Q-164）。
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [selfEffects, text(" Self "), cloneKey(markMisread, "mark"), text(` ${markT}t`)],
            [
              targetEffectsIcon,
              text(" Ignores "),
              cloneKey(targetDupes[0]!, "protection"),
            ],
            [text("Ignores "), cloneKey(targetDupes[1]!, "guard")],
            [targetEffectsIcon, text(" "), debuff, text(` ${debuffT}t`)],
          ],
        });
      }
      default:
        return card;
    }
  });
}
