import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  DamageEntry,
  ShuffleEntry,
} from "./types";

/** 核心盒 Occultist II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p191",
    name: "Sacrificial Stab",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p192",
    name: "Sacrificial Stab",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p194",
    name: "Abyssal Artillery",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p195",
    name: "Abyssal Artillery",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p197",
    name: "Weakening Curse",
    level: 2,
    original: ["{target_effects} {debuff} 3t"],
    lines: ["{target_effects} {debuff} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 3,
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
    id: "hero_skill:p198",
    name: "Weakening Curse",
    level: 3,
    original: ["{target_effects} {debuff} 4t"],
    lines: ["{target_effects} {debuff} 4t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 4,
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
    id: "hero_skill:p200",
    name: "Wyrd Reconstruction",
    level: 2,
    original: ["{target_effects} 1 {bleed} 3t"],
    lines: ["{target_effects} 1 {bleed} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 1,
        },
      ],
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p201",
    name: "Wyrd Reconstruction",
    level: 3,
    original: ["{target_effects} 2 {bleed} 2t"],
    lines: ["{target_effects} 2 {bleed} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 2,
          amount: 2,
        },
      ],
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p203",
    name: "Vulnerability Hex",
    level: 2,
    original: ["{target_effects} {mark} 3t"],
    lines: ["{target_effects} {mark} 3t"],
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p204",
    name: "Vulnerability Hex",
    level: 3,
    original: ["{target_effects} {mark} 4t"],
    lines: ["{target_effects} {mark} 4t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 4,
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
    id: "hero_skill:p206",
    name: "Hands from the Abyss",
    level: 2,
    original: ["{target_effects} {stun} 2t, {light} -1"],
    lines: ["{target_effects} {stun} 2t, {light} -1"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p207",
    name: "Hands from the Abyss",
    level: 3,
    original: ["{target_effects} {stun} 3t, {light} -1"],
    lines: ["{target_effects} {stun} 3t, {light} -1"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 3,
        },
      ],
    },
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  // 完整 FRONT p196/p199/p202/p205；仅 Occ I，不向 II/III 外推。
  {
    id: "hero_skill:p196",
    hero: "OCCULTIST",
    name: "Weakening Curse",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p199",
    hero: "OCCULTIST",
    name: "Wyrd Reconstruction",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 1 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 1, duration: 2 }],
  },
  {
    id: "hero_skill:p202",
    hero: "OCCULTIST",
    name: "Vulnerability Hex",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p205",
    hero: "OCCULTIST",
    name: "Hands from the Abyss",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 2t, {light} -1",
    effects: [{ kind: "stun", duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p196",
    name: "Weakening Curse",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p199",
    name: "Wyrd Reconstruction",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p202",
    name: "Vulnerability Hex",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
export const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:p190",
    name: "Sacrificial Stab",
    level: 1,
    page: 190,
    lineIndex: 0,
    amount: 1,
    condition: "eldritch",
    suffix: "Eldritch",
  },
  {
    id: "hero_skill:p193",
    name: "Abyssal Artillery",
    level: 1,
    page: 193,
    lineIndex: 0,
    amount: 1,
    condition: "eldritch",
    suffix: "Eldritch",
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
export const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h10:p208",
    name: "Daemon’s Pull",
    level: 1,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h10:p209",
    name: "Daemon’s Pull",
    level: 2,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h10:p210",
    name: "Daemon’s Pull",
    level: 3,
    lineIndex: 0,
    scope: "target",
    text: "Pull 2",
  },
];
