import type {
  HeroAnnotationModule,
  HeroSkillPatch,
  StatusEffectEntry,
  ShuffleEntry,
  IgnoresEntry,
} from "./types";
import {
  applyPatches,
  cloneKey,
  iconFromCard,
  iconFromPool,
  segmentOnCardInEffects,
  text,
} from "./patch-helpers";
import type { IconSegment } from "./patch-helpers";
import { lineSignature } from "./shared";
import type { NormalizedHeroSkillCard } from "../schema";
import { normalizedHeroSkillCardSchema } from "../schema";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p280",
    name: "Purge",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:p283",
    name: "Revenge",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t, {debuff} 1t",
    effects: [
      { kind: "mark", duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:p286",
    name: "Withstand",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 2t, {mark} 2t",
    effects: [
      { kind: "protection", duration: 2 },
      { kind: "mark", duration: 2 },
    ],
  },
  {
    id: "hero_skill:p292",
    name: "Intimidate",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p292",
    name: "Intimidate",
    level: 1,
    lineIndex: 3,
    scope: "target",
    signature: "{target_effects} {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  // R-200：Leper Purge II/III 已确认读数（仅自身 Buff 2t；III 伤害见 hero-annotations/h14-leper stats 覆盖）。
  {
    id: "hero_skill:p281",
    name: "Purge",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:p282",
    name: "Purge",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:p284",
    name: "Revenge",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t, {debuff} 2t",
    effects: [
      { kind: "mark", duration: 2 },
      { kind: "debuff", duration: 2 },
    ],
  },
  {
    id: "hero_skill:p285",
    name: "Revenge",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 3t, {debuff} 3t",
    effects: [
      { kind: "mark", duration: 3 },
      { kind: "debuff", duration: 3 },
    ],
  },
  {
    id: "hero_skill:p287",
    name: "Withstand",
    level: 2,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 2t, {mark} 1t",
    effects: [
      { kind: "protection", duration: 2 },
      { kind: "mark", duration: 1 },
    ],
  },
  {
    id: "hero_skill:p288",
    name: "Withstand",
    level: 3,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 3t, {mark} 1t",
    effects: [
      { kind: "protection", duration: 3 },
      { kind: "mark", duration: 1 },
    ],
  },
  {
    id: "hero_skill:p293",
    name: "Intimidate",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p293",
    name: "Intimidate",
    level: 2,
    lineIndex: 3,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p294",
    name: "Intimidate",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {mark} 1t",
    effects: [{ kind: "mark", duration: 1 }],
  },
  {
    id: "hero_skill:p294",
    name: "Intimidate",
    level: 3,
    lineIndex: 3,
    scope: "target",
    signature: "{target_effects} {debuff} 3t",
    effects: [{ kind: "debuff", duration: 3 }],
  },
];

/**
 * R-200 / Q-163～Q-166：Leper II–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 * 每张卡一条 patch；hero / 卡名 / 等级 / 页码由 applyPatches 统一断言。
 */
function purge(page: number): HeroSkillPatch {
  const level = page - 279;
  return {
    id: `hero_skill:p${page}`,
    name: "Purge",
    level,
    page,
    apply: (card) => {
      const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (rawSig !== "{self_effects}{buff}Self{buff}2t")
        throw new Error(`${card.id} Purge Buff 行漂移（R-048）`);
      const buff = iconFromCard(card, "buff");
      const selfEffects = iconFromCard(card, "self_effects");
      const base = {
        ...card,
        effect_lines: [[selfEffects, text(" Self "), buff, text(" 2t")], card.effect_lines[1]!],
      };
      if (page !== 282) return normalizedHeroSkillCardSchema.parse(base);
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
    },
  };
}

function revenge(page: number): HeroSkillPatch {
  const level = page - 282;
  return {
    id: `hero_skill:p${page}`,
    name: "Revenge",
    level,
    page,
    apply: (card) => {
      const markT = Math.max(2, level);
      const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (rawSig !== `{heal}{mark}${markT}t,{debuff}${level}t`)
        throw new Error(`${card.id} Revenge 效果行漂移（R-048）`);
      const line = card.effect_lines[0]!;
      const leadHeal = line[0];
      if (leadHeal?.type !== "icon" || leadHeal.icon.iconId !== "20ffe98e2d")
        throw new Error(`${card.id} Revenge 行首误 heal 段漂移（R-048）`);
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        effect_lines: [[cloneKey(leadHeal, "target_effects"), ...line.slice(1)]],
      });
    },
  };
}

function withstand(cards: readonly NormalizedHeroSkillCard[], page: number): HeroSkillPatch {
  const level = page - 285;
  const protT = page === 288 ? 3 : 2;
  const markT = page === 286 ? 2 : 1;
  return {
    id: `hero_skill:p${page}`,
    name: "Withstand",
    level,
    page,
    apply: (card) => {
      const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (rawSig !== `{self_effects}{buff}Self{protection}${protT}t,{mark}${markT}t`)
        throw new Error(`${card.id} Withstand 效果行漂移（R-048）`);
      const selfEffects = iconFromCard(card, "self_effects");
      const protection = iconFromCard(card, "protection");
      const mark = iconFromCard(card, "mark");
      const rangeIcon = iconFromPool(cards, "range");
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        stats_line: null,
        verified_self_range: true,
        effect_lines: [
          [rangeIcon, text(" Self")],
          [selfEffects, text(" Self "), protection, text(` ${protT}t, `), mark, text(` ${markT}t`)],
        ],
      });
    },
  };
}

function solemnity(cards: readonly NormalizedHeroSkillCard[], page: number): HeroSkillPatch {
  const level = page - 288;
  const heal = 3 + level * 3;
  return {
    id: `hero_skill:p${page}`,
    name: "Solemnity",
    level,
    page,
    apply: (card) => {
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      const expected =
        page !== 291
          ? `{self_effects}{buff}Self{buff}{heal}${heal},{shuffle}-1`
          : "{self_effects}{buff}Self{buff}12{heal},{shuffle}-1";
      if (raw !== expected) throw new Error(`${card.id} Solemnity 效果行漂移（R-048）`);
      const selfEffects = iconFromCard(card, "self_effects");
      const healIcon = iconFromCard(card, "heal");
      const shuffleMisread = segmentOnCardInEffects(card, "f18923574c");
      const rangeIcon = iconFromPool(cards, "range");
      const stressIcon = iconFromPool(cards, "stress");
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        stats_line: [rangeIcon, text(" Self")],
        verified_self_heal: { lineIndex: 0, amount: heal, source: "print_front" },
        verified_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
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
    },
  };
}

function intimidate(cards: readonly NormalizedHeroSkillCard[], page: number): HeroSkillPatch {
  const markT = page === 294 ? 1 : 2;
  const debuffT = page - 291;
  return {
    id: `hero_skill:p${page}`,
    name: "Intimidate",
    level: debuffT,
    page,
    apply: (card) => {
      const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
      const expected = [
        `{self_effects}{buff}Self{buff}${markT}t`,
        `{light}Ignores{target_effects}{target_effects},{${page === 292 ? "light" : "debuff"}}${debuffT}t`,
      ];
      if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
        throw new Error(`${card.id} Intimidate 效果行漂移（R-048）`);
      const selfEffects = iconFromCard(card, "self_effects");
      const markMisread = segmentOnCardInEffects(card, "d4329c2a97");
      const targetDupes = card.effect_lines[1]!.filter(
        (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
      );
      if (targetDupes.length < 2)
        throw new Error(`${card.id} Intimidate Ignores 行 target_effects 漂移（R-048）`);
      const debuff = iconFromPool(cards, "debuff");
      const targetEffectsIcon = iconFromPool(cards, "target_effects");
      // 印刷签名闸仍用提取键 `{light}`（9ffbd6087a）；折角箭头非光照，不入结算段（Q-164）。
      return normalizedHeroSkillCardSchema.parse({
        ...card,
        effect_lines: [
          [selfEffects, text(" Self "), cloneKey(markMisread, "mark"), text(` ${markT}t`)],
          [targetEffectsIcon, text(" Ignores "), cloneKey(targetDupes[0]!, "protection")],
          [text("Ignores "), cloneKey(targetDupes[1]!, "guard")],
          [targetEffectsIcon, text(" "), debuff, text(` ${debuffT}t`)],
        ],
      });
    },
  };
}

function leperPatches(cards: readonly NormalizedHeroSkillCard[]): readonly HeroSkillPatch[] {
  return [
    purge(280),
    purge(281),
    purge(282),
    revenge(283),
    revenge(284),
    revenge(285),
    withstand(cards, 286),
    withstand(cards, 287),
    withstand(cards, 288),
    solemnity(cards, 289),
    solemnity(cards, 290),
    solemnity(cards, 291),
    intimidate(cards, 292),
    intimidate(cards, 293),
    intimidate(cards, 294),
  ];
}

export const leperAnnotations: HeroAnnotationModule = {
  id: "h14",
  hero: "LEPER",
  apply: (cards) => applyPatches(cards, leperPatches(cards), "LEPER"),
};

/** 文本位移规则（scope + Push/Pull 原文）。 */
export const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:warrens:h14:p280",
    name: "Purge",
    level: 1,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:warrens:h14:p281",
    name: "Purge",
    level: 2,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:warrens:h14:p282",
    name: "Purge",
    level: 3,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
];

/** Ignores Protection / Guard 规则。 */
export const ignoresEntries: readonly IgnoresEntry[] = [
  {
    id: "hero_skill:warrens:h14:p292",
    name: "Intimidate",
    level: 1,
    lineIndex: 1,
    kind: "protection",
  },
  { id: "hero_skill:warrens:h14:p292", name: "Intimidate", level: 1, lineIndex: 2, kind: "guard" },
  {
    id: "hero_skill:warrens:h14:p293",
    name: "Intimidate",
    level: 2,
    lineIndex: 1,
    kind: "protection",
  },
  { id: "hero_skill:warrens:h14:p293", name: "Intimidate", level: 2, lineIndex: 2, kind: "guard" },
  {
    id: "hero_skill:warrens:h14:p294",
    name: "Intimidate",
    level: 3,
    lineIndex: 1,
    kind: "protection",
  },
  { id: "hero_skill:warrens:h14:p294", name: "Intimidate", level: 3, lineIndex: 2, kind: "guard" },
];
