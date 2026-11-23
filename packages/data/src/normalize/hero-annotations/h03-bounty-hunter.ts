import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  BountyStatusRow,
  LayoutEntry,
  DamageEntry,
} from "./types";

/** 核心盒 Bounty Hunter II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p044",
    name: "Collect Bounty",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
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
    id: "hero_skill:p045",
    name: "Collect Bounty",
    level: 3,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
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
    id: "hero_skill:p047",
    name: "Mark for Death",
    level: 2,
    original: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    lines: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    flags: {
      verified_status_effects: [
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
      verified_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p050",
    name: "Come Hither",
    level: 2,
    original: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p051",
    name: "Come Hither",
    level: 3,
    original: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p053",
    name: "Uppercut",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p054",
    name: "Uppercut",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p056",
    name: "Flashbang",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p057",
    name: "Flashbang",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p059",
    name: "Finish Him",
    level: 2,
    original: ["{target_effects} {damage} +3 vs {stun}"],
    lines: ["{target_effects} {damage} +3 vs {stun}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "stunned",
        source: "print_front",
      },
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p060",
    name: "Finish Him",
    level: 3,
    original: ["{target_effects} {damage} +4 vs {stun}"],
    lines: ["{target_effects} {damage} +4 vs {stun}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 4,
        condition: "stunned",
        source: "print_front",
      },
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p062",
    name: "Caltrops",
    level: 2,
    original: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    lines: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    flags: {
      verified_status_effects: [
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

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p055",
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
    id: "hero_skill:p049",
    hero: "BOUNTY HUNTER",
    name: "Come Hither",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t, {shuffle} Pull 2",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p052",
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
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p058",
    name: "Finish Him",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p055",
    name: "Flashbang",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** R-089：赏金猎人限定状态卡（目标框 763ad8e857 逐卡改为 debuff）。 */
export const bountyStatusRows: readonly BountyStatusRow[] = [
  {
    id: "hero_skill:p046",
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
    id: "hero_skill:p061",
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
    id: "hero_skill:p048",
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
    id: "hero_skill:p063",
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
export const layoutEntries: readonly LayoutEntry[] = [
  {
    kind: "target-box",
    id: "hero_skill:p043",
    hero: "BOUNTY HUNTER",
    name: "Collect Bounty",
    page: 43,
    first: "{target_effects} {damage} +1 vs Humans",
    second: ["{damage} +2 vs {mark}", "{target_effects} {damage} +2 vs {mark}"],
    label: "Collect Bounty I",
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
export const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:p058",
    name: "Finish Him",
    level: 1,
    page: 58,
    lineIndex: 0,
    amount: 2,
    condition: "stunned",
    suffix: "{stun}",
  },
];
