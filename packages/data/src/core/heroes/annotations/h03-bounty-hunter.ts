import type {
  DirectAttackEntry,
  DirectAttackFace,
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  BountyStatusRow,
  LayoutEntry,
  DamageEntry,
  ShuffleEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Bounty Hunter II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h03:p044",
    name: "Collect Bounty",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      annotation_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 2,
          condition: "human",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 3,
          condition: "marked",
          source: "print_front",
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p045",
    name: "Collect Bounty",
    level: 3,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      annotation_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 2,
          condition: "human",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 3,
          condition: "marked",
          source: "print_front",
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p047",
    name: "Mark for Death",
    level: 2,
    original: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    lines: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 3,
        },
        {
          lineIndex: 0,
          segmentIndex: 4,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
      ],
      annotation_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h03:p050",
    name: "Come Hither",
    level: 2,
    original: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p051",
    name: "Come Hither",
    level: 3,
    original: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p053",
    name: "Uppercut",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p054",
    name: "Uppercut",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h03:p056",
    name: "Flashbang",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h03:p057",
    name: "Flashbang",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h03:p059",
    name: "Finish Him",
    level: 2,
    original: ["{target_effects} {damage} +3 vs {stun}"],
    lines: ["{target_effects} {damage} +3 vs {stun}"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "stunned",
        source: "print_front",
      },
      annotation_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h03:p060",
    name: "Finish Him",
    level: 3,
    original: ["{target_effects} {damage} +4 vs {stun}"],
    lines: ["{target_effects} {damage} +4 vs {stun}"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 4,
        condition: "stunned",
        source: "print_front",
      },
      annotation_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h03:p062",
    name: "Caltrops",
    level: 2,
    original: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    lines: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 2,
          amount: 3,
        },
        {
          lineIndex: 0,
          segmentIndex: 4,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
      ],
    },
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h03:p055",
    hero: "BOUNTY HUNTER",
    name: "Flashbang",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {shuffle} Push 1 or {shuffle} Pull 1",
    effects: [{ kind: "stun", duration: 1 }],
  },
  // 当前版 FRONT p49/p52，完整卡面及 R20–21：状态与同行位移一并消费。
  {
    id: "hero_skill:core:h03:p049",
    hero: "BOUNTY HUNTER",
    name: "Come Hither",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t, {shuffle} Pull 2",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:core:h03:p052",
    hero: "BOUNTY HUNTER",
    name: "Uppercut",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {shuffle} Push 2",
    effects: [{ kind: "stun", duration: 1 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h03:p058",
    name: "Finish Him",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h03:p055",
    name: "Flashbang",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** R-089：赏金猎人限定状态卡（目标框 buff（词典 329） 逐卡改为 debuff）。 */
const bountyStatusRows: readonly BountyStatusRow[] = [
  {
    id: "hero_skill:core:h03:p046",
    name: "Mark for Death",
    page: 46,
    level: 1,
    lines: ["{target_effects}{mark}3t,{buff}2t", "{self_effects}Self{buff}2t"],
    stats: "Acc10",
    labels: [["Acc", 10]],
    effects: [
      { scope: "target", kind: "mark", duration: 3, lineIndex: 0 },
      { scope: "target", kind: "debuff", duration: 2, lineIndex: 0 },
      { scope: "self", kind: "buff", duration: 2, lineIndex: 1 },
    ],
  },
  {
    id: "hero_skill:core:h03:p061",
    name: "Caltrops",
    page: 61,
    level: 1,
    lines: ["{target_effects}2{bleed}3t,{buff}1t"],
    stats: "{range}2{target_monster}Crit1{damage}2Acc9{damage}1",
    labels: [
      ["Crit", 1],
      ["Acc", 9],
    ],
    effects: [
      { scope: "target", kind: "bleed", duration: 3, amount: 2, lineIndex: 0 },
      { scope: "target", kind: "debuff", duration: 1, lineIndex: 0 },
    ],
  },
  {
    id: "hero_skill:core:h03:p048",
    name: "Mark for Death",
    page: 48,
    level: 3,
    lines: ["{target_effects}{mark}3t,{buff}3t", "{self_effects}Self{buff}3t"],
    stats: "Acc12",
    labels: [["Acc", 12]],
    effects: [
      { scope: "target", kind: "mark", duration: 3, lineIndex: 0 },
      { scope: "target", kind: "debuff", duration: 3, lineIndex: 0 },
      { scope: "self", kind: "buff", duration: 3, lineIndex: 1 },
    ],
  },
  {
    id: "hero_skill:core:h03:p063",
    name: "Caltrops",
    page: 63,
    level: 3,
    lines: ["{target_effects}3{bleed}3t,{buff}3t"],
    stats: "{range}2{target_monster}Crit1{damage}3Acc11{damage}2",
    labels: [
      ["Crit", 1],
      ["Acc", 11],
    ],
    effects: [
      { scope: "target", kind: "bleed", duration: 3, amount: 3, lineIndex: 0 },
      { scope: "target", kind: "debuff", duration: 3, lineIndex: 0 },
    ],
  },
];

/** 逐卡已复核的效果框布局（R-048）。 */
const layoutEntries: readonly LayoutEntry[] = [
  {
    kind: "target-box",
    id: "hero_skill:core:h03:p043",
    hero: "BOUNTY HUNTER",
    name: "Collect Bounty",
    page: 43,
    first: "{target_effects} {damage} +1 vs Humans",
    second: ["{damage} +2 vs {mark}", "{target_effects} {damage} +2 vs {mark}"],
    label: "Collect Bounty I",
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h03:p058",
    name: "Finish Him",
    level: 1,
    page: 58,
    lineIndex: 0,
    amount: 2,
    condition: "stunned",
    suffix: "{stun}",
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h03:p049",
    name: "Come Hither",
    level: 1,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h03:p050",
    name: "Come Hither",
    level: 2,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h03:p051",
    name: "Come Hither",
    level: 3,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h03:p052",
    name: "Uppercut",
    level: 1,
    lineIndex: 0,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h03:p053",
    name: "Uppercut",
    level: 2,
    lineIndex: 0,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h03:p054",
    name: "Uppercut",
    level: 3,
    lineIndex: 0,
    scope: "target",
    text: "Push 2",
  },
];

const caltrops: DirectAttackFace = {
  stances: ["support", "ranged", "defensive"],
  range: 2,
  monsterTargets: 1,
};

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h03:p061",
    name: "Caltrops",
    ...caltrops,
    hit: { threshold: 9, damage: 1 },
    critical: { threshold: 1, damage: 2 },
  },
  {
    id: "hero_skill:core:h03:p062",
    name: "Caltrops",
    ...caltrops,
    hit: { threshold: 10, damage: 2 },
    critical: { threshold: 1, damage: 3 },
  },
  {
    id: "hero_skill:core:h03:p063",
    name: "Caltrops",
    ...caltrops,
    hit: { threshold: 11, damage: 2 },
    critical: { threshold: 1, damage: 3 },
  },
];

const entries: HeroAnnotationEntries = {
  directAttack: directAttackEntries,
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  bounty: bountyStatusRows,
  layout: layoutEntries,
  damage: damageEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h03:p043", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p044", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p045", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p046", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p047", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p048", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p049", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p050", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p051", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p052", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p053", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p054", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p055", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p056", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p057", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p058", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p059", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h03:p060", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h03:p043", effect: "damage" },
    { id: "hero_skill:core:h03:p044", effect: "damage" },
    { id: "hero_skill:core:h03:p045", effect: "damage" },
    { id: "hero_skill:core:h03:p049", effect: "damage" },
    { id: "hero_skill:core:h03:p050", effect: "damage" },
    { id: "hero_skill:core:h03:p051", effect: "damage" },
    { id: "hero_skill:core:h03:p052", effect: "damage" },
    { id: "hero_skill:core:h03:p053", effect: "damage" },
    { id: "hero_skill:core:h03:p054", effect: "damage" },
    { id: "hero_skill:core:h03:p058", effect: "damage" },
    { id: "hero_skill:core:h03:p059", effect: "damage" },
    { id: "hero_skill:core:h03:p060", effect: "damage" },
  ],
};

export const h03 = defineHeroModule({
  id: "h03",
  hero: "BOUNTY HUNTER",
  entries,
  fixes: null,
});
