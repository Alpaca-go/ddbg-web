import type {
  DirectAttackEntry,
  DirectAttackFace,
  StatusEffectEntry,
  RangeEntry,
  LayoutEntry,
  ShuffleEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h02:p028",
    name: "Barbaric YAWP!",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p029",
    name: "Barbaric YAWP!",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p030",
    name: "Barbaric YAWP!",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p031",
    name: "If It Bleeds",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p032",
    name: "If It Bleeds",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p033",
    name: "If It Bleeds",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p037",
    name: "Adrenaline Rush",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight} , {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p040",
    name: "Bleed Out",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p041",
    name: "Bleed Out",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h02:p042",
    name: "Bleed Out",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h02:p038",
    name: "Adrenaline Rush",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h02:p039",
    name: "Adrenaline Rush",
    level: 3,
    min: 0,
    max: 1,
  },
];

/** 逐卡已复核的效果框布局（R-048）。 */
const layoutEntries: readonly LayoutEntry[] = [
  {
    kind: "rebuild-lines",
    id: "hero_skill:core:h02:p038",
    name: "Adrenaline Rush",
    level: 2,
    page: 38,
    expected: [
      "{range} 0-1 {target_hero}",
      "{self_effects} Self Remove {bleed} {blight} , {target_effects} Remove {bleed} {blight} , {buff} 2t",
      "{buff} 2t",
    ],
    output: [
      "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
      "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    ],
  },
  {
    kind: "rebuild-lines",
    id: "hero_skill:core:h02:p039",
    name: "Adrenaline Rush",
    level: 3,
    page: 39,
    expected: [
      "{range} 0-1 {target_hero} {target_hero}",
      "{self_effects} Self Remove {bleed}",
      "{target_effects} Remove {bleed} {blight} , {buff} 2t",
      "{blight} , {buff} 2t",
    ],
    output: [
      "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
      "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    ],
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h02:p034",
    name: "Breakthrough",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h02:p035",
    name: "Breakthrough",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h02:p036",
    name: "Breakthrough",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
];

const adjacentMelee: DirectAttackFace = {
  stances: ["ranged", "defensive", "aggressive"],
  range: 1,
  monsterTargets: 1,
};
const breakthrough: DirectAttackFace = {
  stances: ["support", "ranged", "defensive"],
  range: 1,
  monsterTargets: 3,
};

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h02:p022",
    name: "Wicked Hack",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 7 },
    critical: { threshold: 1, damage: 12 },
  },
  {
    id: "hero_skill:core:h02:p023",
    name: "Wicked Hack",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 9 },
    critical: { threshold: 1, damage: 17 },
  },
  {
    id: "hero_skill:core:h02:p024",
    name: "Wicked Hack",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 11 },
    critical: { threshold: 1, damage: 20 },
  },
  {
    id: "hero_skill:core:h02:p025",
    name: "Iron Swan",
    stances: ["aggressive"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 7 },
    critical: { threshold: 1, damage: 12 },
  },
  {
    id: "hero_skill:core:h02:p026",
    name: "Iron Swan",
    stances: ["aggressive"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 9 },
    critical: { threshold: 1, damage: 17 },
  },
  {
    id: "hero_skill:core:h02:p027",
    name: "Iron Swan",
    stances: ["aggressive"],
    range: 2,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 11 },
    critical: { threshold: 1, damage: 21 },
  },
  {
    id: "hero_skill:core:h02:p031",
    name: "If It Bleeds",
    ...adjacentMelee,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 0, damage: 8 },
  },
  {
    id: "hero_skill:core:h02:p032",
    name: "If It Bleeds",
    ...adjacentMelee,
    hit: { threshold: 10, damage: 6 },
    critical: { threshold: 0, damage: 11 },
  },
  {
    id: "hero_skill:core:h02:p033",
    name: "If It Bleeds",
    ...adjacentMelee,
    hit: { threshold: 10, damage: 8 },
    critical: { threshold: 0, damage: 15 },
  },
  {
    id: "hero_skill:core:h02:p034",
    name: "Breakthrough",
    ...breakthrough,
    hit: { threshold: 8, damage: 4 },
    critical: { threshold: 0, damage: 6 },
  },
  {
    id: "hero_skill:core:h02:p035",
    name: "Breakthrough",
    ...breakthrough,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 0, damage: 8 },
  },
  {
    id: "hero_skill:core:h02:p036",
    name: "Breakthrough",
    ...breakthrough,
    hit: { threshold: 11, damage: 6 },
    critical: { threshold: 0, damage: 10 },
  },
];

const entries: HeroAnnotationEntries = {
  directAttack: directAttackEntries,
  status: statusEntries,
  range: rangeEntries,
  layout: layoutEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h02:p028", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p029", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p030", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p037", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p038", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p039", hero: 2, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p040", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p041", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h02:p042", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h02:p040", effect: "damage" },
    { id: "hero_skill:core:h02:p041", effect: "damage" },
    { id: "hero_skill:core:h02:p042", effect: "damage" },
  ],
};

export const h02 = defineHeroModule({
  id: "h02",
  hero: "HELLION",
  entries,
  fixes: null,
});
