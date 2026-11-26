import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { StatusEffectEntry, ShuffleEntry } from "./types";
import type { HeroAnnotationEntries } from "./types";
import { lineSignature } from "./shared";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import {
  assertCardMeta,
  defineHeroModule,
  cloneKey,
  iconFromCard,
  iconFromPool,
  segmentOnCardAll,
  text,
} from "./patch-helpers";
import type { CardFix } from "./patch-helpers";
import type { IconSegment } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  // R-200 / Warrens Antiquarian I–III（TDH p298–p315）。
  {
    id: "hero_skill:warrens:h15:p298",
    hero: "ANTIQUARIAN",
    name: "Festering Vapours",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 2t, {debuff} 1t",
    effects: [
      { kind: "blight", amount: 2, duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p301",
    hero: "ANTIQUARIAN",
    name: "Get Down!",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t, {shuffle} Push 2",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p304",
    hero: "ANTIQUARIAN",
    name: "Flashpowder",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {debuff} 1t",
    effects: [
      { kind: "stun", duration: 1 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p307",
    name: "Fortifying Vapours",
    level: 1,
    lineIndex: 2,
    scope: "target",
    signature: "{target_effects} {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p308",
    name: "Fortifying Vapours",
    level: 2,
    lineIndex: 2,
    scope: "target",
    signature: "{target_effects} {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p309",
    name: "Fortifying Vapours",
    level: 3,
    lineIndex: 2,
    scope: "target",
    signature: "{target_effects} {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p307",
    name: "Fortifying Vapours",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p310",
    name: "Invigorating Vapours",
    level: 1,
    lineIndex: 2,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p311",
    name: "Invigorating Vapours",
    level: 2,
    lineIndex: 2,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p312",
    name: "Invigorating Vapours",
    level: 3,
    lineIndex: 2,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p310",
    name: "Invigorating Vapours",
    level: 1,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 0 {target_hero}",
    signature: "{target_effects} {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:warrens:h15:p313",
    hero: "ANTIQUARIAN",
    name: "Protect Me",
    level: 1,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{target_effects} {guard} 2t, {protection} 2t, {mark} 3t",
    effects: [
      { kind: "guard", duration: 2 },
      { kind: "protection", duration: 2 },
      { kind: "mark", duration: 3 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p299",
    name: "Festering Vapours",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 3t, {debuff} 2t",
    effects: [
      { kind: "blight", amount: 2, duration: 3 },
      { kind: "debuff", duration: 2 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p300",
    name: "Festering Vapours",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {blight} 3t, {debuff} 2t",
    effects: [
      { kind: "blight", amount: 3, duration: 3 },
      { kind: "debuff", duration: 2 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p302",
    name: "Get Down!",
    level: 2,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t, {shuffle} Push 2",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p303",
    name: "Get Down!",
    level: 3,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 4t, {shuffle} Push 1 or Push 2",
    effects: [{ kind: "buff", duration: 4 }],
  },
  {
    id: "hero_skill:warrens:h15:p305",
    name: "Flashpowder",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {debuff} 2t",
    effects: [
      { kind: "stun", duration: 1 },
      { kind: "debuff", duration: 2 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p306",
    name: "Flashpowder",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 2t, {debuff} 2t",
    effects: [
      { kind: "stun", duration: 2 },
      { kind: "debuff", duration: 2 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p308",
    name: "Fortifying Vapours",
    level: 2,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p309",
    name: "Fortifying Vapours",
    level: 3,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p311",
    name: "Invigorating Vapours",
    level: 2,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 0 {target_hero} {target_hero}",
    signature: "{target_effects} {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:warrens:h15:p312",
    name: "Invigorating Vapours",
    level: 3,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 0 {target_hero} {target_hero} {target_hero}",
    signature: "{target_effects} {buff} 4t",
    effects: [{ kind: "buff", duration: 4 }],
  },
  {
    id: "hero_skill:warrens:h15:p314",
    name: "Protect Me",
    level: 2,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{target_effects} {guard} 3t, {protection} 2t, {mark} 2t",
    effects: [
      { kind: "guard", duration: 3 },
      { kind: "protection", duration: 2 },
      { kind: "mark", duration: 2 },
    ],
  },
  {
    id: "hero_skill:warrens:h15:p315",
    name: "Protect Me",
    level: 3,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{target_effects} {guard} 3t, {protection} 3t, {mark} 1t",
    effects: [
      { kind: "guard", duration: 3 },
      { kind: "protection", duration: 3 },
      { kind: "mark", duration: 1 },
    ],
  },
];

function fixGetDown(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  buffT: number,
  pushText: string,
  rawExpected: [string, string],
  rangeIcon: IconSegment,
) {
  assertCardMeta(card, "ANTIQUARIAN", page, "Get Down!", level);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (JSON.stringify(rawSigs) !== JSON.stringify(rawExpected))
    throw new Error(`${card.id} Get Down 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const buff = iconFromCard(card, "buff");
  const shuffle = iconFromCard(card, "shuffle");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: null,
    annotation_self_range: true,
    effect_lines: [
      [rangeIcon, text(" Self")],
      [selfEffects, text(" Self "), buff, text(` ${buffT}t, `), shuffle, text(` ${pushText}`)],
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
function antiquarianFixes(
  cards: readonly NormalizedHeroSkillCard[],
): Readonly<Record<string, CardFix>> {
  const rangeIcon = iconFromPool(cards, "range");
  const healMarker = iconFromPool(cards, "damage_or_heal_combined_marker");
  const targetHeroIcon = iconFromPool(cards, "target_hero");
  const targetEffectsIcon = iconFromPool(cards, "target_effects");
  return {
    "hero_skill:warrens:h15:p298": (card) => {
      const page = card.pages[0]!;
      const level = page - 297;
      assertCardMeta(card, "ANTIQUARIAN", page, "Festering Vapours", level);
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      const expected =
        level === 1
          ? "{damage}2{damage}2t,{bleed}1t"
          : `{target_effects}${level}{bleed}3t,{debuff}2t`;
      if (raw !== expected) throw new Error(`${card.id} Festering 效果行漂移（R-048）`);
      const amount = level === 3 ? 3 : 2;
      const duration = level === 1 ? 2 : 3;
      const debuffDuration = level === 1 ? 1 : 2;
      return parseAnnotatedHeroSkillCard({
        ...card,
        effect_lines: [
          [
            targetEffectsIcon,
            text(` ${amount} `),
            iconFromPool(cards, "blight"),
            text(` ${duration}t, `),
            iconFromPool(cards, "debuff"),
            text(` ${debuffDuration}t`),
          ],
        ],
      });
    },
    "hero_skill:warrens:h15:p299": (card) => {
      const page = card.pages[0]!;
      const level = page - 297;
      assertCardMeta(card, "ANTIQUARIAN", page, "Festering Vapours", level);
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      const expected =
        level === 1
          ? "{damage}2{damage}2t,{bleed}1t"
          : `{target_effects}${level}{bleed}3t,{debuff}2t`;
      if (raw !== expected) throw new Error(`${card.id} Festering 效果行漂移（R-048）`);
      const amount = level === 3 ? 3 : 2;
      const duration = level === 1 ? 2 : 3;
      const debuffDuration = level === 1 ? 1 : 2;
      return parseAnnotatedHeroSkillCard({
        ...card,
        effect_lines: [
          [
            targetEffectsIcon,
            text(` ${amount} `),
            iconFromPool(cards, "blight"),
            text(` ${duration}t, `),
            iconFromPool(cards, "debuff"),
            text(` ${debuffDuration}t`),
          ],
        ],
      });
    },
    "hero_skill:warrens:h15:p300": (card) => {
      const page = card.pages[0]!;
      const level = page - 297;
      assertCardMeta(card, "ANTIQUARIAN", page, "Festering Vapours", level);
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      const expected =
        level === 1
          ? "{damage}2{damage}2t,{bleed}1t"
          : `{target_effects}${level}{bleed}3t,{debuff}2t`;
      if (raw !== expected) throw new Error(`${card.id} Festering 效果行漂移（R-048）`);
      const amount = level === 3 ? 3 : 2;
      const duration = level === 1 ? 2 : 3;
      const debuffDuration = level === 1 ? 1 : 2;
      return parseAnnotatedHeroSkillCard({
        ...card,
        effect_lines: [
          [
            targetEffectsIcon,
            text(` ${amount} `),
            iconFromPool(cards, "blight"),
            text(` ${duration}t, `),
            iconFromPool(cards, "debuff"),
            text(` ${debuffDuration}t`),
          ],
        ],
      });
    },
    "hero_skill:warrens:h15:p301": (card) =>
      fixGetDown(
        card,
        301,
        1,
        2,
        "Push 2",
        ["{range}{buff}Self", "{self_effects}{buff}Self{buff}2t,{shuffle}Push2"],
        rangeIcon,
      ),
    "hero_skill:warrens:h15:p304": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 304, "Flashpowder", 1);
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (raw !== "{target_effects}{blight}1t,{buff}1t")
        throw new Error(`${card.id} Flashpowder I 效果行漂移（R-048）`);
      const line = card.effect_lines[0]!;
      const misStun = line.find((s) => s.type === "icon" && s.icon.key === "blight");
      const misDebuff = line.find((s) => s.type === "icon" && s.icon.key === "buff");
      if (misStun?.type !== "icon" || misDebuff?.type !== "icon")
        throw new Error(`${card.id} Flashpowder I 状态段漂移`);
      return parseAnnotatedHeroSkillCard({
        ...card,
        effect_lines: [
          [
            iconFromCard(card, "target_effects"),
            text(" "),
            cloneKey(misStun, "stun"),
            text(" 1t, "),
            cloneKey(misDebuff, "debuff"),
            text(" 1t"),
          ],
        ],
      });
    },
    "hero_skill:warrens:h15:p307": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 307, "Fortifying Vapours", 1);
      const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
      if (statsSig !== "{range}1{target_hero}Crit0{buff}{heal}2Acc12{buff}{heal}1")
        throw new Error(`${card.id} Fortifying I stats_line 漂移（R-048）`);
      const healIcon = iconFromCard(card, "heal");
      const stats = card.stats_line!.map((segment) => {
        if (segment.type === "icon" && segment.icon.key === "buff")
          return cloneKey(healMarker, "damage_or_heal_combined_marker");
        return segment.type === "icon" && segment.icon.key === "heal" ? healIcon : segment;
      });
      const selfEffects = iconFromCard(card, "self_effects");
      const buff = iconFromCard(card, "buff");
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: stats,
        annotation_self_heal: { lineIndex: 0, amount: 1, source: "print_front" },
        effect_lines: [
          [selfEffects, text(" Self "), healIcon, text(" 1")],
          [selfEffects, text(" Self "), buff, text(" 2t")],
          [targetEffectsIcon, text(" "), buff, text(" 2t")],
        ],
        unlabeled_numbers: [
          ...card.unlabeled_numbers,
          {
            text: "1",
            numeric: 1,
            anchor: {
              type: "beside_icon" as const,
              left_icon: null,
              inside_icon: healIcon.icon,
            },
          },
        ],
      });
    },
    "hero_skill:warrens:h15:p310": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 310, "Invigorating Vapours", 1);
      const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
      if (
        JSON.stringify(rawSigs) !==
        JSON.stringify([
          "{range}0{target_hero}",
          "{self_effects}{buff}Self{buff}2t",
          "{target_effects}{debuff}2t",
        ])
      )
        throw new Error(`${card.id} Invigorating I 效果行漂移（R-048）`);
      const buff = iconFromCard(card, "buff");
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: null,
        effect_lines: [
          [rangeIcon, text(" 0 "), targetHeroIcon],
          [targetEffectsIcon, text(" "), buff, text(" 2t")],
          [iconFromCard(card, "self_effects"), text(" Self "), buff, text(" 2t")],
        ],
      });
    },
    "hero_skill:warrens:h15:p313": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 313, "Protect Me", 1);
      const raw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
      if (raw !== "{light}{shuffle}2t,{damage}2t,{mark}3t")
        throw new Error(`${card.id} Protect Me I 效果行漂移（R-048）`);
      const mark = iconFromCard(card, "mark");
      const lightMis = segmentOnCardAll(card, "9ffbd6087a");
      const dmgMis = segmentOnCardAll(card, "8d4bbe5e11");
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: null,
        effect_lines: [
          card.effect_lines[0]!,
          [
            targetEffectsIcon,
            text(" "),
            cloneKey(lightMis, "guard"),
            text(" 2t, "),
            cloneKey(dmgMis, "protection"),
            text(" 2t, "),
            mark,
            text(" 3t"),
          ],
        ],
      });
    },
    "hero_skill:warrens:h15:p302": (card) =>
      fixGetDown(
        card,
        302,
        2,
        3,
        "Push 2",
        ["{range}{buff}Self", "{self_effects}{buff}Self{buff}3t,{shuffle}Push2"],
        rangeIcon,
      ),
    "hero_skill:warrens:h15:p303": (card) =>
      fixGetDown(
        card,
        303,
        3,
        4,
        "Push 1 or Push 2",
        ["{range}{buff}Self", "{self_effects}{buff}Self{buff}4t,{shuffle}Push1orPush2"],
        rangeIcon,
      ),
    "hero_skill:warrens:h15:p305": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 305, "Flashpowder", 2);
      const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
      if (raw !== "{target_effects}{bleed}1t,{buff}2t")
        throw new Error(`${card.id} Flashpowder II 效果行漂移（R-048）`);
      const line = card.effect_lines[0]!;
      const misStun = line.find((s) => s.type === "icon" && s.icon.key === "bleed");
      const misDebuff = line.find((s) => s.type === "icon" && s.icon.key === "buff");
      if (misStun?.type !== "icon" || misDebuff?.type !== "icon")
        throw new Error(`${card.id} Flashpowder II 状态段漂移`);
      return parseAnnotatedHeroSkillCard({
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
    },
    "hero_skill:warrens:h15:p306": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 306, "Flashpowder", 3);
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
      return parseAnnotatedHeroSkillCard({
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
    },
    "hero_skill:warrens:h15:p308": (card) => {
      const page = card.id === "hero_skill:warrens:h15:p308" ? 308 : 309;
      const selfHeal = page === 308 ? 2 : 4;
      const buffT = page === 308 ? 3 : 3;
      assertCardMeta(card, "ANTIQUARIAN", page, "Fortifying Vapours", page === 308 ? 2 : 3);
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
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: stats,
        annotation_self_heal: { lineIndex: 0, amount: selfHeal, source: "print_front" },
        effect_lines: [
          [selfEffects, text(" Self "), healIcon, text(` ${selfHeal}`)],
          [selfEffects, text(" Self "), buff, text(` ${buffT}t`)],
          [targetEffectsIcon, text(" "), buff, text(` ${buffT}t`)],
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
    },
    "hero_skill:warrens:h15:p309": (card) => {
      const page = card.id === "hero_skill:warrens:h15:p308" ? 308 : 309;
      const selfHeal = page === 308 ? 2 : 4;
      const buffT = page === 308 ? 3 : 3;
      assertCardMeta(card, "ANTIQUARIAN", page, "Fortifying Vapours", page === 308 ? 2 : 3);
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
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: stats,
        annotation_self_heal: { lineIndex: 0, amount: selfHeal, source: "print_front" },
        effect_lines: [
          [selfEffects, text(" Self "), healIcon, text(` ${selfHeal}`)],
          [selfEffects, text(" Self "), buff, text(` ${buffT}t`)],
          [targetEffectsIcon, text(" "), buff, text(` ${buffT}t`)],
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
    },
    "hero_skill:warrens:h15:p311": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 311, "Invigorating Vapours", 2);
      const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
      const expected = [
        "{range}0{target_hero}{target_hero}",
        "{self_effects}{buff}Self{buff}2t",
        "{target_effects}{debuff}3t",
      ];
      if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
        throw new Error(`${card.id} Invigorating II 效果行漂移（R-048）`);
      const buff = iconFromCard(card, "buff");
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: null,
        effect_lines: [
          [rangeIcon, text(" 0 "), targetHeroIcon, text(" "), targetHeroIcon],
          [iconFromCard(card, "target_effects"), text(" "), buff, text(" 3t")],
          [iconFromCard(card, "self_effects"), text(" Self "), buff, text(" 2t")],
        ],
      });
    },
    "hero_skill:warrens:h15:p312": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 312, "Invigorating Vapours", 3);
      const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
      const expected = [
        "{range}0{target_hero_or_monster}{target_hero_or_monster}{target_hero_or_monster}",
        "{self_effects}{buff}Self{buff}3t",
        "{target_effects}{debuff}4t",
      ];
      if (JSON.stringify(rawSigs) !== JSON.stringify(expected))
        throw new Error(`${card.id} Invigorating III 效果行漂移（R-048）`);
      const buff = iconFromCard(card, "buff");
      return parseAnnotatedHeroSkillCard({
        ...card,
        stats_line: null,
        effect_lines: [
          [
            rangeIcon,
            text(" 0 "),
            targetHeroIcon,
            text(" "),
            targetHeroIcon,
            text(" "),
            targetHeroIcon,
          ],
          [iconFromCard(card, "target_effects"), text(" "), buff, text(" 4t")],
          [iconFromCard(card, "self_effects"), text(" Self "), buff, text(" 3t")],
        ],
      });
    },
    "hero_skill:warrens:h15:p314": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 314, "Protect Me", 2);
      const raw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
      if (raw !== "{light}{shuffle}3t,{damage}2t,{mark}2t")
        throw new Error(`${card.id} Protect Me II 效果行漂移（R-048）`);
      const mark = iconFromCard(card, "mark");
      const lightMis = segmentOnCardAll(card, "9ffbd6087a");
      const dmgMis = segmentOnCardAll(card, "8d4bbe5e11");
      const targetEffects = iconFromCard(card, "target_effects");
      return parseAnnotatedHeroSkillCard({
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
    },
    "hero_skill:warrens:h15:p315": (card) => {
      assertCardMeta(card, "ANTIQUARIAN", 315, "Protect Me", 3);
      const raw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
      if (raw !== "{light}{target_effects}3t,{target_effects}3t,{stress}1t")
        throw new Error(`${card.id} Protect Me III 效果行漂移（R-048）`);
      const targets = card.effect_lines[1]!.filter(
        (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
      );
      if (targets.length < 2) throw new Error(`${card.id} Protect Me III 目标效果段漂移（R-048）`);
      const lightMis = segmentOnCardAll(card, "9ffbd6087a");
      const markMis = segmentOnCardAll(card, "9d58d3d431");
      const targetEffects = iconFromCard(card, "target_effects");
      return parseAnnotatedHeroSkillCard({
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
    },
  };
}

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:warrens:h15:p301",
    name: "Get Down!",
    level: 1,
    lineIndex: 1,
    scope: "self",
    text: "Push 2",
  },
  {
    id: "hero_skill:warrens:h15:p302",
    name: "Get Down!",
    level: 2,
    lineIndex: 1,
    scope: "self",
    text: "Push 2",
  },
  {
    id: "hero_skill:warrens:h15:p303",
    name: "Get Down!",
    level: 3,
    lineIndex: 1,
    scope: "self",
    text: "Push 1 or Push 2",
  },
];

const entries: HeroAnnotationEntries = {
  status: statusEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:warrens:h15:p295", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p296", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p297", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p298", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p299", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p300", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p301", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p302", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p303", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p304", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p305", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p306", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p307", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p308", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:warrens:h15:p309", hero: 1, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:warrens:h15:p295", effect: "damage" },
    { id: "hero_skill:warrens:h15:p296", effect: "damage" },
    { id: "hero_skill:warrens:h15:p297", effect: "damage" },
    { id: "hero_skill:warrens:h15:p298", effect: "damage" },
    { id: "hero_skill:warrens:h15:p299", effect: "damage" },
    { id: "hero_skill:warrens:h15:p300", effect: "damage" },
    { id: "hero_skill:warrens:h15:p307", effect: "heal" },
    { id: "hero_skill:warrens:h15:p308", effect: "heal" },
    { id: "hero_skill:warrens:h15:p309", effect: "heal" },
  ],
};

export const h15 = defineHeroModule({
  id: "h15",
  hero: "ANTIQUARIAN",
  entries,
  fixes: antiquarianFixes,
});
