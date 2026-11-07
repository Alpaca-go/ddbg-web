import type { NormalizedHeroSkillCard, Segment } from "./schema";
import { normalizedHeroSkillCardSchema } from "./schema";
import { lineSignature } from "./verified-hero-layout";

type IconSegment = Extract<Segment, { type: "icon" }>;

function iconFrom(card: NormalizedHeroSkillCard, key: string): IconSegment {
  const segmentPools = [
    ...(card.stats_line ?? []),
    ...card.effect_lines.flat(),
  ];
  const hit = segmentPools.find(
    (s): s is IconSegment =>
      s.type === "icon" &&
      s.icon.key === key &&
      ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
  );
  if (hit) return hit;
  const flat = [...card.front_icons, ...card.name_row_icons, ...card.top_row_icons].find(
    (icon) =>
      icon.key === key && ["confirmed", "confirmed_rulebook"].includes(icon.naming),
  );
  if (!flat) throw new Error(`${card.id} 缺少已确认图标 {${key}}（R-048）`);
  return { type: "icon", icon: flat };
}

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

function text(value: string): Segment {
  return { type: "text", text: value };
}

function assertCard(card: NormalizedHeroSkillCard, page: number, name: string, level: number) {
  if (
    card.hero !== "LEPER" ||
    card.name !== name ||
    card.back_name !== name ||
    card.level !== level ||
    card.back_level !== level ||
    card.pages[0] !== page ||
    card.pages.length !== 1 ||
    card.copies !== 1 ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据与 Warrens Leper 复核漂移（R-048）`);
}

function stressIconSegment(cards: readonly NormalizedHeroSkillCard[]): IconSegment {
  for (const card of cards) {
    for (const line of card.effect_lines) {
      for (const segment of line) {
        if (
          segment.type === "icon" &&
          segment.icon.key === "stress" &&
          ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming)
        )
          return segment;
      }
    }
  }
  throw new Error("缺少已确认 stress 图标段（R-048）");
}

function guardIconSegment(cards: readonly NormalizedHeroSkillCard[]): IconSegment {
  for (const card of cards) {
    for (const line of card.effect_lines) {
      for (const segment of line) {
        if (
          segment.type === "icon" &&
          segment.icon.key === "guard" &&
          ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming)
        )
          return segment;
      }
    }
  }
  throw new Error("缺少已确认 guard 图标段（R-048）");
}

function targetEffectsIconSegment(cards: readonly NormalizedHeroSkillCard[]): IconSegment {
  for (const card of cards) {
    for (const line of card.effect_lines) {
      for (const segment of line) {
        if (
          segment.type === "icon" &&
          segment.icon.key === "target_effects" &&
          ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming)
        )
          return segment;
      }
    }
  }
  throw new Error("缺少已确认 target_effects 图标段（R-048）");
}

function protectionIconSegment(cards: readonly NormalizedHeroSkillCard[]): IconSegment {
  for (const card of cards) {
    for (const line of card.effect_lines) {
      for (const segment of line) {
        if (
          segment.type === "icon" &&
          segment.icon.key === "protection" &&
          ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming)
        )
          return segment;
      }
    }
  }
  throw new Error("缺少已确认 protection 图标段（R-048）");
}

/** R-200 / Phase 7：Leper II–III 逐卡印刷覆盖（不改全局词典）。 */
export function attachVerifiedWarrensLeperHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const stressIcon = stressIconSegment(cards);
  const guardIcon = guardIconSegment(cards);
  const protectionIcon = protectionIconSegment(cards);
  const targetEffectsIcon = targetEffectsIconSegment(cards);

  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p281":
      case "hero_skill:p282": {
        const page = card.id === "hero_skill:p281" ? 281 : 282;
        const level = page === 281 ? 2 : 3;
        assertCard(card, page, "Purge", level);
        const buffSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (buffSig !== "{self_effects}{buff}Self{buff}2t")
          throw new Error(`${card.id} Purge 自身 Buff 行漂移（R-048）`);
        const buff = iconFrom(card, "buff");
        const effect_lines = [
          [iconFrom(card, "self_effects"), text(" Self "), buff, text(" 2t")],
          card.effect_lines[1]!,
        ];
        if (card.id === "hero_skill:p281") {
          return normalizedHeroSkillCardSchema.parse({ ...card, effect_lines });
        }
        const stats = card.stats_line;
        const statsSig = stats ? lineSignature(stats).replace(/\s+/g, "") : "";
        if (statsSig !== "{range}0{target_monster}Crit0{heal}19Acc11{heal}12")
          throw new Error(`${card.id} Purge III stats_line 漂移（R-048）`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines,
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
        const debuffT = markT;
        assertCard(card, page, "Revenge", page === 284 ? 2 : 3);
        const lineSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
        if (lineSig !== `{heal}{mark}${markT}t,{debuff}${debuffT}t`)
          throw new Error(`${card.id} Revenge 效果行漂移（R-048）`);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [
              targetEffectsIcon,
              text(" "),
              iconFrom(card, "mark"),
              text(` ${markT}t, `),
              iconFrom(card, "debuff"),
              text(` ${debuffT}t`),
            ],
          ],
        });
      }
      case "hero_skill:p287":
      case "hero_skill:p288": {
        const page = card.id === "hero_skill:p287" ? 287 : 288;
        const protT = page === 287 ? 2 : 3;
        assertCard(card, page, "Withstand", page === 287 ? 2 : 3);
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          verified_self_range: true,
          effect_lines: [
            [iconFrom(card, "range"), text("Self")],
            [
              iconFrom(card, "self_effects"),
              text(" Self "),
              iconFrom(card, "protection"),
              text(` ${protT}t, `),
              iconFrom(card, "mark"),
              text(" 1t"),
            ],
          ],
        });
      }
      case "hero_skill:p290":
      case "hero_skill:p291": {
        const page = card.id === "hero_skill:p290" ? 290 : 291;
        const heal = page === 290 ? 9 : 12;
        assertCard(card, page, "Solemnity", page === 290 ? 2 : 3);
        const rangeIcon = iconFrom(card, "range");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          stats_line: null,
          verified_self_range: true,
          verified_self_heal: { lineIndex: 1, amount: heal, source: "print_front" },
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
            {
              text: "-1",
              numeric: -1,
              anchor: {
                type: "beside_icon" as const,
                left_icon: stressIcon.icon,
                inside_icon: null,
              },
            },
          ],
          effect_lines: [
            [rangeIcon, text("Self")],
            [
              iconFrom(card, "self_effects"),
              text(" Self "),
              iconFrom(card, "heal"),
              text(` ${heal}`),
            ],
            [iconFrom(card, "self_effects"), text("Self"), stressIcon, text("-1")],
          ],
        });
      }
      case "hero_skill:p293":
      case "hero_skill:p294": {
        const page = card.id === "hero_skill:p293" ? 293 : 294;
        const debuffT = page === 293 ? 2 : 3;
        const buffT = page === 293 ? 2 : 1;
        assertCard(card, page, "Intimidate", page === 293 ? 2 : 3);
        const sigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
        const expected = [
          `{self_effects}{buff}Self{buff}${buffT}t`,
          `{light}Ignores{target_effects}{target_effects},{debuff}${debuffT}t`,
        ];
        if (JSON.stringify(sigs) !== JSON.stringify(expected))
          throw new Error(`${card.id} Intimidate 效果行漂移（R-048）`);
        const buff = iconFrom(card, "buff");
        return normalizedHeroSkillCardSchema.parse({
          ...card,
          effect_lines: [
            [iconFrom(card, "self_effects"), text(" Self "), buff, text(` ${buffT}t`)],
            [targetEffectsIcon, text(" Ignores "), protectionIcon],
            [targetEffectsIcon, text(" "), iconFrom(card, "debuff"), text(` ${debuffT}t`)],
            [text("Ignores "), guardIcon],
          ],
        });
      }
      default:
        return card;
    }
  });
}
