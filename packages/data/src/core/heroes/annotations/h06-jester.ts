import type {
  DirectAttackEntry,
  HealSupportEntry,
  DirectAttackFace,
  CoreHigherSkillRow,
  StatusEffectEntry,
  LayoutEntry,
  SelfEffectEntry,
  TargetStressEntry,
  ShuffleEntry,
  IgnoresEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Jester II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h06:p110",
    name: "Harvest",
    level: 2,
    original: ["{target_effects} 2 {bleed} 3t"],
    lines: ["{target_effects} 2 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h06:p111",
    name: "Harvest",
    level: 3,
    original: ["{target_effects} 3 {bleed} 3t"],
    lines: ["{target_effects} 3 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h06:p116",
    name: "Solo",
    level: 2,
    original: ["{target_effects} {stun} 1t", "{self_effects} Self {buff} 2t, {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 1t", "{self_effects} Self {buff} 2t, {shuffle} Pull 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h06:p117",
    name: "Solo",
    level: 3,
    original: ["{target_effects} {stun} 2t", "{self_effects} Self {buff} 3t, {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 2t", "{self_effects} Self {buff} 3t, {shuffle} Pull 2"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
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
    },
  },
  {
    id: "hero_skill:core:h06:p119",
    name: "Battle Ballad",
    level: 2,
    original: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 3t",
      "{target_effects} {buff} 3t",
    ],
    lines: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 3t",
      "{target_effects} {buff} 3t",
    ],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 3,
        },
      ],
      annotation_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h06:p120",
    name: "Battle Ballad",
    level: 3,
    original: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 4t",
      "{target_effects} {buff} 4t",
    ],
    lines: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 4t",
      "{target_effects} {buff} 4t",
    ],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 4,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 4,
        },
      ],
      annotation_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h06:p125",
    name: "Slice Off",
    level: 2,
    original: ["{target_effects} 3 {bleed} 2t"],
    lines: ["{target_effects} 3 {bleed} 2t"],
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
      ],
    },
  },
  {
    id: "hero_skill:core:h06:p126",
    name: "Slice Off",
    level: 3,
    original: ["{target_effects} 3 {bleed} 3t"],
    lines: ["{target_effects} 3 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h06:p107",
    name: "Dirk Stab",
    level: 2,
    original: ["{self_effects} Self {shuffle} Pull 1,", "Ignores {guard}"],
    lines: ["{self_effects} Self {shuffle} Pull 1", "Ignores {guard}"],
    flags: {},
  },
  {
    id: "hero_skill:core:h06:p108",
    name: "Dirk Stab",
    level: 3,
    original: ["{self_effects} Self {shuffle} Pull 1,", "Ignores {guard}"],
    lines: ["{self_effects} Self {shuffle} Pull 1", "Ignores {guard}"],
    flags: {},
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  // R-211：卡面文字已确认、一级运行时尚未读取的状态。
  {
    id: "hero_skill:core:h06:p109",
    name: "Harvest",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 2, duration: 2 }],
  },
  {
    id: "hero_skill:core:h06:p115",
    name: "Solo",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  {
    id: "hero_skill:core:h06:p115",
    name: "Solo",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t, {shuffle} Pull 2",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h06:p118",
    name: "Battle Ballad",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h06:p118",
    name: "Battle Ballad",
    level: 1,
    lineIndex: 2,
    scope: "target",
    headerSignature: "{range} 1 {target_hero} {target_hero}",
    signature: "{target_effects} {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:core:h06:p124",
    name: "Slice Off",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 1t",
    effects: [{ kind: "bleed", amount: 3, duration: 1 }],
  },
];

/** 逐卡已复核的效果框布局（R-048）。 */
const layoutEntries: readonly LayoutEntry[] = [
  {
    kind: "strip-trailing-comma",
    id: "hero_skill:core:h06:p106",
    name: "Dirk Stab",
    level: 1,
    expected: ["{self_effects} Self {shuffle} Pull 1,", "Ignores {guard}"],
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
const selfEffectEntries: readonly SelfEffectEntry[] = [
  {
    id: "hero_skill:core:h06:p121",
    name: "Inspiring Tune",
    level: 1,
    lineIndex: 1,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h06:p122",
    name: "Inspiring Tune",
    level: 2,
    lineIndex: 1,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h06:p123",
    name: "Inspiring Tune",
    level: 3,
    lineIndex: 1,
    kind: "stress",
    amount: -1,
  },
];

/** Inspiring Tune 的目标压力行；与上面的自身压力行成对（R-213 同型）。 */
const targetStressEntries: readonly TargetStressEntry[] = [
  {
    id: "hero_skill:core:h06:p121",
    name: "Inspiring Tune",
    level: 1,
    lineIndex: 0,
    amount: -1,
  },
  {
    id: "hero_skill:core:h06:p122",
    name: "Inspiring Tune",
    level: 2,
    lineIndex: 0,
    amount: -1,
  },
  {
    id: "hero_skill:core:h06:p123",
    name: "Inspiring Tune",
    level: 3,
    lineIndex: 0,
    amount: -1,
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h06:p106",
    name: "Dirk Stab",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h06:p107",
    name: "Dirk Stab",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h06:p108",
    name: "Dirk Stab",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h06:p112",
    name: "Finale",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 3",
  },
  {
    id: "hero_skill:core:h06:p113",
    name: "Finale",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 3",
  },
  {
    id: "hero_skill:core:h06:p114",
    name: "Finale",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 3",
  },
  {
    id: "hero_skill:core:h06:p115",
    name: "Solo",
    level: 1,
    lineIndex: 1,
    scope: "self",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h06:p116",
    name: "Solo",
    level: 2,
    lineIndex: 1,
    scope: "self",
    text: "Pull 2",
  },
  {
    id: "hero_skill:core:h06:p117",
    name: "Solo",
    level: 3,
    lineIndex: 1,
    scope: "self",
    text: "Pull 2",
  },
];

/** Ignores Protection / Guard 规则。 */
const ignoresEntries: readonly IgnoresEntry[] = [
  { id: "hero_skill:core:h06:p106", name: "Dirk Stab", level: 1, lineIndex: 1, kind: "guard" },
  { id: "hero_skill:core:h06:p107", name: "Dirk Stab", level: 2, lineIndex: 1, kind: "guard" },
  { id: "hero_skill:core:h06:p108", name: "Dirk Stab", level: 3, lineIndex: 1, kind: "guard" },
];

const harvest: DirectAttackFace = { stances: ["ranged", "defensive"], range: 1, monsterTargets: 2 };
const adjacentRanged: DirectAttackFace = {
  stances: ["ranged", "defensive"],
  range: 1,
  monsterTargets: 1,
};

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h06:p106",
    name: "Dirk Stab",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 1, damage: 7 },
  },
  {
    id: "hero_skill:core:h06:p107",
    name: "Dirk Stab",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 7 },
    critical: { threshold: 1, damage: 11 },
  },
  {
    id: "hero_skill:core:h06:p108",
    name: "Dirk Stab",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 8 },
    critical: { threshold: 1, damage: 14 },
  },
  {
    id: "hero_skill:core:h06:p109",
    name: "Harvest",
    ...harvest,
    hit: { threshold: 9, damage: 3 },
    critical: { threshold: 0, damage: 4 },
  },
  {
    id: "hero_skill:core:h06:p110",
    name: "Harvest",
    ...harvest,
    hit: { threshold: 10, damage: 4 },
    critical: { threshold: 0, damage: 6 },
  },
  {
    id: "hero_skill:core:h06:p111",
    name: "Harvest",
    ...harvest,
    hit: { threshold: 11, damage: 5 },
    critical: { threshold: 1, damage: 8 },
  },
  {
    id: "hero_skill:core:h06:p112",
    name: "Finale",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 14, damage: 7 },
    critical: { threshold: 1, damage: 10 },
  },
  {
    id: "hero_skill:core:h06:p113",
    name: "Finale",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 15, damage: 10 },
    critical: { threshold: 1, damage: 16 },
  },
  {
    id: "hero_skill:core:h06:p114",
    name: "Finale",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 16, damage: 12 },
    critical: { threshold: 1, damage: 20 },
  },
  {
    id: "hero_skill:core:h06:p124",
    name: "Slice Off",
    ...adjacentRanged,
    hit: { threshold: 10, damage: 4 },
    critical: { threshold: 1, damage: 6 },
  },
  {
    id: "hero_skill:core:h06:p125",
    name: "Slice Off",
    ...adjacentRanged,
    hit: { threshold: 11, damage: 5 },
    critical: { threshold: 1, damage: 8 },
  },
  {
    id: "hero_skill:core:h06:p126",
    name: "Slice Off",
    ...adjacentRanged,
    hit: { threshold: 12, damage: 6 },
    critical: { threshold: 2, damage: 10 },
  },
];

const healSupportEntries: readonly HealSupportEntry[] = [
  {
    id: "hero_skill:core:h06:p121",
    name: "Inspiring Tune",
    stances: ["support", "ranged"],
    range: 0,
    heroTargets: 2,
    hit: { threshold: 20 },
    critical: { threshold: 2 },
  },
  {
    id: "hero_skill:core:h06:p122",
    name: "Inspiring Tune",
    stances: ["support", "ranged"],
    range: 0,
    heroTargets: 3,
    hit: { threshold: 20 },
    critical: { threshold: 2 },
  },
  {
    id: "hero_skill:core:h06:p123",
    name: "Inspiring Tune",
    stances: ["support", "ranged"],
    range: 0,
    heroTargets: 3,
    hit: { threshold: 20 },
    critical: { threshold: 3 },
  },
];

const entries: HeroAnnotationEntries = {
  healSupport: healSupportEntries,
  directAttack: directAttackEntries,
  higher: coreHigherRows,
  status: statusEntries,
  layout: layoutEntries,
  self: selfEffectEntries,
  targetStress: targetStressEntries,
  shuffle: shuffleEntries,
  ignores: ignoresEntries,
  targetCount: [
    { id: "hero_skill:core:h06:p115", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h06:p116", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h06:p117", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h06:p121", hero: 2, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h06:p122", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h06:p123", hero: 3, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [],
};

export const h06 = defineHeroModule({
  id: "h06",
  hero: "JESTER",
  entries,
  fixes: null,
});
