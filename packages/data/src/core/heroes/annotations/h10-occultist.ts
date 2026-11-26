import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  DamageEntry,
  ShuffleEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Occultist II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h10:p191",
    name: "Sacrificial Stab",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p192",
    name: "Sacrificial Stab",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p194",
    name: "Abyssal Artillery",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p195",
    name: "Abyssal Artillery",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p197",
    name: "Weakening Curse",
    level: 2,
    original: ["{target_effects} {debuff} 3t"],
    lines: ["{target_effects} {debuff} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 3,
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
    id: "hero_skill:core:h10:p198",
    name: "Weakening Curse",
    level: 3,
    original: ["{target_effects} {debuff} 4t"],
    lines: ["{target_effects} {debuff} 4t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 4,
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
    id: "hero_skill:core:h10:p200",
    name: "Wyrd Reconstruction",
    level: 2,
    original: ["{target_effects} 1 {bleed} 3t"],
    lines: ["{target_effects} 1 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 1,
        },
      ],
      annotation_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p201",
    name: "Wyrd Reconstruction",
    level: 3,
    original: ["{target_effects} 2 {bleed} 2t"],
    lines: ["{target_effects} 2 {bleed} 2t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 2,
          amount: 2,
        },
      ],
      annotation_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p203",
    name: "Vulnerability Hex",
    level: 2,
    original: ["{target_effects} {mark} 3t"],
    lines: ["{target_effects} {mark} 3t"],
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
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h10:p204",
    name: "Vulnerability Hex",
    level: 3,
    original: ["{target_effects} {mark} 4t"],
    lines: ["{target_effects} {mark} 4t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 4,
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
    id: "hero_skill:core:h10:p206",
    name: "Hands from the Abyss",
    level: 2,
    original: ["{target_effects} {stun} 2t, {light} -1"],
    lines: ["{target_effects} {stun} 2t, {light} -1"],
    flags: {
      annotation_status_effects: [
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
    id: "hero_skill:core:h10:p207",
    name: "Hands from the Abyss",
    level: 3,
    original: ["{target_effects} {stun} 3t, {light} -1"],
    lines: ["{target_effects} {stun} 3t, {light} -1"],
    flags: {
      annotation_status_effects: [
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
const statusEntries: readonly StatusEffectEntry[] = [
  // 完整 FRONT p196/p199/p202/p205；仅 Occ I，不向 II/III 外推。
  {
    id: "hero_skill:core:h10:p196",
    hero: "OCCULTIST",
    name: "Weakening Curse",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h10:p199",
    hero: "OCCULTIST",
    name: "Wyrd Reconstruction",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 1 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 1, duration: 2 }],
  },
  {
    id: "hero_skill:core:h10:p202",
    hero: "OCCULTIST",
    name: "Vulnerability Hex",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:core:h10:p205",
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
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h10:p196",
    name: "Weakening Curse",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h10:p199",
    name: "Wyrd Reconstruction",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h10:p202",
    name: "Vulnerability Hex",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h10:p190",
    name: "Sacrificial Stab",
    level: 1,
    page: 190,
    lineIndex: 0,
    amount: 1,
    condition: "eldritch",
    suffix: "Eldritch",
  },
  {
    id: "hero_skill:core:h10:p193",
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
const shuffleEntries: readonly ShuffleEntry[] = [
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

const entries: HeroAnnotationEntries = {
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  damage: damageEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h10:p190", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p191", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p192", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p193", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p194", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p195", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p196", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p197", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p198", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p199", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p200", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p201", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p202", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p203", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p204", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p205", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p206", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p207", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p208", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p209", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h10:p210", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h10:p190", effect: "damage" },
    { id: "hero_skill:core:h10:p191", effect: "damage" },
    { id: "hero_skill:core:h10:p192", effect: "damage" },
    { id: "hero_skill:core:h10:p193", effect: "damage" },
    { id: "hero_skill:core:h10:p194", effect: "damage" },
    { id: "hero_skill:core:h10:p195", effect: "damage" },
    { id: "hero_skill:core:h10:p196", effect: "damage" },
    { id: "hero_skill:core:h10:p197", effect: "damage" },
    { id: "hero_skill:core:h10:p198", effect: "damage" },
    { id: "hero_skill:core:h10:p199", effect: "heal" },
    { id: "hero_skill:core:h10:p200", effect: "heal" },
    { id: "hero_skill:core:h10:p201", effect: "heal" },
    { id: "hero_skill:core:h10:p202", effect: "damage" },
    { id: "hero_skill:core:h10:p203", effect: "damage" },
    { id: "hero_skill:core:h10:p204", effect: "damage" },
    { id: "hero_skill:core:h10:p205", effect: "damage" },
    { id: "hero_skill:core:h10:p206", effect: "damage" },
    { id: "hero_skill:core:h10:p207", effect: "damage" },
    { id: "hero_skill:core:h10:p208", effect: "damage" },
    { id: "hero_skill:core:h10:p209", effect: "damage" },
    { id: "hero_skill:core:h10:p210", effect: "damage" },
  ],
};

export const h10 = defineHeroModule({
  id: "h10",
  hero: "OCCULTIST",
  entries,
  fixes: null,
});
