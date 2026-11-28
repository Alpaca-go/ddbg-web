import type { HealSupportEntry, DirectAttackEntry } from "./types";
import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  RallyingFlareEntry,
  DamageEntry,
  ShuffleEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Arbalest II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h08:p149",
    name: "Sniper Shot",
    level: 2,
    original: ["{target_effects} {damage} +5 vs {mark}"],
    lines: ["{target_effects} {damage} +5 vs {mark}"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 5,
        condition: "marked",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h08:p150",
    name: "Sniper Shot",
    level: 3,
    original: ["{target_effects} {damage} +9 vs {mark}"],
    lines: ["{target_effects} {damage} +9 vs {mark}"],
    flags: {
      annotation_damage_bonus: {
        lineIndex: 0,
        amount: 9,
        condition: "marked",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h08:p152",
    name: "Suppressive Fire",
    level: 2,
    original: ["{target_effects} {debuff} 2t"],
    lines: ["{target_effects} {debuff} 2t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 2,
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
    id: "hero_skill:core:h08:p153",
    name: "Suppressive Fire",
    level: 3,
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
    id: "hero_skill:core:h08:p155",
    name: "Sniper’s Mark",
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
    id: "hero_skill:core:h08:p156",
    name: "Sniper’s Mark",
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
    id: "hero_skill:core:h08:p161",
    name: "Blindfire",
    level: 2,
    original: ["{self_effects} Self {shuffle} Push 2"],
    lines: ["{self_effects} Self {shuffle} Push 2"],
    flags: {
      annotation_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h08:p162",
    name: "Blindfire",
    level: 3,
    original: ["{self_effects} Self {shuffle} Push 2"],
    lines: ["{self_effects} Self {shuffle} Push 2"],
    flags: {
      annotation_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h08:p164",
    name: "Battlefield Bandage",
    level: 2,
    original: ["{self_effects} Self {buff} 2t"],
    lines: ["{self_effects} Self {buff} 2t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
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
    id: "hero_skill:core:h08:p165",
    name: "Battlefield Bandage",
    level: 3,
    original: ["{self_effects} Self {buff} 2t"],
    lines: ["{self_effects} Self {buff} 2t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
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
    id: "hero_skill:core:h08:p167",
    name: "Rallying Flare",
    level: 2,
    original: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    lines: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    flags: {
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h08:p168",
    name: "Rallying Flare",
    level: 3,
    original: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    lines: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    flags: {
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h08:p151",
    name: "Suppressive Fire",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  {
    id: "hero_skill:core:h08:p154",
    name: "Sniper’s Mark",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:core:h08:p163",
    name: "Battlefield Bandage",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h08:p166",
    name: "Rallying Flare",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h08:p167",
    name: "Rallying Flare",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h08:p168",
    name: "Rallying Flare",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h08:p166",
    name: "Rallying Flare",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p167",
    name: "Rallying Flare",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p168",
    name: "Rallying Flare",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p151",
    name: "Suppressive Fire",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p154",
    name: "Sniper’s Mark",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p160",
    name: "Blindfire",
    level: 1,
    min: 0,
    max: 2,
  },
  {
    id: "hero_skill:core:h08:p163",
    name: "Battlefield Bandage",
    level: 1,
    min: 0,
    max: 1,
  },
];

/** Rallying Flare / Skeet Shot 逐卡复核（R-103）：混阵营目标与眩晕/标记清除行。 */
const rallyingFlareEntries: readonly RallyingFlareEntry[] = [
  {
    id: "hero_skill:core:h08:p166",
    hero: "ARBALEST",
    name: "Rallying Flare",
    level: 1,
    acc: 10,
    targetIcons: 2,
  },
  {
    id: "hero_skill:core:h08:p167",
    hero: "ARBALEST",
    name: "Rallying Flare",
    level: 2,
    acc: 11,
    targetIcons: 3,
  },
  {
    id: "hero_skill:core:h08:p168",
    hero: "ARBALEST",
    name: "Rallying Flare",
    level: 3,
    acc: 12,
    targetIcons: 4,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h08:p148",
    name: "Sniper Shot",
    level: 1,
    page: 148,
    lineIndex: 0,
    amount: 3,
    condition: "marked",
    suffix: "{mark}",
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h08:p157",
    name: "Bola",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h08:p157",
    name: "Bola",
    level: 1,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p158",
    name: "Bola",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p158",
    name: "Bola",
    level: 2,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p159",
    name: "Bola",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p159",
    name: "Bola",
    level: 3,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p160",
    name: "Blindfire",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h08:p161",
    name: "Blindfire",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 2",
  },
  {
    id: "hero_skill:core:h08:p162",
    name: "Blindfire",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 2",
  },
];

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h08:p157",
    name: "Bola",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 10, damage: 3 },
    critical: { threshold: 1, damage: 6 },
  },
  {
    id: "hero_skill:core:h08:p158",
    name: "Bola",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 4 },
    critical: { threshold: 1, damage: 8 },
  },
  {
    id: "hero_skill:core:h08:p159",
    name: "Bola",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 12, damage: 5 },
    critical: { threshold: 1, damage: 9 },
  },
  {
    id: "hero_skill:core:h08:p160",
    name: "Blindfire",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 0,
    monsterTargets: 1,
    hit: { threshold: 8, damage: 5 },
    critical: { threshold: 0, damage: 8 },
  },
  {
    id: "hero_skill:core:h08:p161",
    name: "Blindfire",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 0,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 6 },
    critical: { threshold: 0, damage: 11 },
  },
  {
    id: "hero_skill:core:h08:p162",
    name: "Blindfire",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 0,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 8 },
    critical: { threshold: 0, damage: 14 },
  },
  {
    id: "hero_skill:core:h08:p148",
    name: "Sniper Shot",
    stances: ["support", "ranged"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 6 },
    critical: { threshold: 1, damage: 9 },
  },
  {
    id: "hero_skill:core:h08:p149",
    name: "Sniper Shot",
    stances: ["support", "ranged"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 8 },
    critical: { threshold: 1, damage: 12 },
  },
  {
    id: "hero_skill:core:h08:p150",
    name: "Sniper Shot",
    stances: ["support", "ranged"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 10 },
    critical: { threshold: 1, damage: 16 },
  },
  {
    id: "hero_skill:core:h08:p151",
    name: "Suppressive Fire",
    stances: ["support", "ranged"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 9, damage: 2 },
    critical: { threshold: 0, damage: 4 },
  },
  {
    id: "hero_skill:core:h08:p152",
    name: "Suppressive Fire",
    stances: ["support", "ranged"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 10, damage: 3 },
    critical: { threshold: 0, damage: 6 },
  },
  {
    id: "hero_skill:core:h08:p153",
    name: "Suppressive Fire",
    stances: ["support", "ranged"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 4 },
    critical: { threshold: 0, damage: 7 },
  },
];

const healSupportEntries: readonly HealSupportEntry[] = [
  {
    id: "hero_skill:core:h08:p163",
    name: "Battlefield Bandage",
    stances: ["support", "ranged"],
    range: 1,
    rangeMinimum: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 8, heal: 4 },
    critical: { threshold: 0, heal: 6 },
  },
  {
    id: "hero_skill:core:h08:p164",
    name: "Battlefield Bandage",
    stances: ["support", "ranged"],
    range: 1,
    rangeMinimum: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 9, heal: 5 },
    critical: { threshold: 0, heal: 8 },
  },
  {
    id: "hero_skill:core:h08:p165",
    name: "Battlefield Bandage",
    stances: ["support", "ranged"],
    range: 1,
    rangeMinimum: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 10, heal: 7 },
    critical: { threshold: 0, heal: 10 },
  },
];

const entries: HeroAnnotationEntries = {
  healSupport: healSupportEntries,
  directAttack: directAttackEntries,
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  rallyingFlare: rallyingFlareEntries,
  damage: damageEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h08:p154", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h08:p155", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h08:p156", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h08:p163", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h08:p164", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h08:p165", hero: 1, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h08:p163", effect: "heal" },
    { id: "hero_skill:core:h08:p164", effect: "heal" },
    { id: "hero_skill:core:h08:p165", effect: "heal" },
  ],
};

export const h08 = defineHeroModule({
  id: "h08",
  hero: "ARBALEST",
  entries,
  fixes: null,
});
