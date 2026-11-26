import type { StatusEffectEntry, RangeEntry, DamageEntry, ShuffleEntry } from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h04:p073",
    name: "Grapeshot Blast",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t",
    effects: [
      {
        kind: "debuff",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p074",
    name: "Grapeshot Blast",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [
      {
        kind: "debuff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p075",
    name: "Grapeshot Blast",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 3t",
    effects: [
      {
        kind: "debuff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p076",
    name: "Tracking Shot",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p077",
    name: "Tracking Shot",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 4t",
    effects: [
      {
        kind: "buff",
        duration: 4,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p078",
    name: "Tracking Shot",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 4t",
    effects: [
      {
        kind: "buff",
        duration: 4,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p079",
    name: "Duelist’s Advance",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 2t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p080",
    name: "Duelist’s Advance",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 3t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p081",
    name: "Duelist’s Advance",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 3t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p082",
    name: "Open Vein",
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
    id: "hero_skill:core:h04:p083",
    name: "Open Vein",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h04:p084",
    name: "Open Vein",
    level: 3,
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
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h04:p067",
    name: "Pistol Shot",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h04:p068",
    name: "Pistol Shot",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h04:p069",
    name: "Pistol Shot",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h04:p073",
    name: "Grapeshot Blast",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h04:p074",
    name: "Grapeshot Blast",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h04:p075",
    name: "Grapeshot Blast",
    level: 3,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h04:p076",
    name: "Tracking Shot",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h04:p077",
    name: "Tracking Shot",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h04:p078",
    name: "Tracking Shot",
    level: 3,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h04:p067",
    name: "Pistol Shot",
    level: 1,
    page: 67,
    lineIndex: 0,
    amount: 2,
    condition: "marked",
    suffix: "{mark}",
  },
  {
    id: "hero_skill:core:h04:p068",
    name: "Pistol Shot",
    level: 2,
    page: 68,
    lineIndex: 0,
    amount: 3,
    condition: "marked",
    suffix: "{mark}",
  },
  {
    id: "hero_skill:core:h04:p069",
    name: "Pistol Shot",
    level: 3,
    page: 69,
    lineIndex: 0,
    amount: 4,
    condition: "marked",
    suffix: "{mark}",
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h04:p070",
    name: "Point Blank Shot",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p070",
    name: "Point Blank Shot",
    level: 1,
    lineIndex: 1,
    scope: "target",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p071",
    name: "Point Blank Shot",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p071",
    name: "Point Blank Shot",
    level: 2,
    lineIndex: 1,
    scope: "target",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p072",
    name: "Point Blank Shot",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p072",
    name: "Point Blank Shot",
    level: 3,
    lineIndex: 1,
    scope: "target",
    text: "Push 1",
  },
  {
    id: "hero_skill:core:h04:p079",
    name: "Duelist’s Advance",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h04:p080",
    name: "Duelist’s Advance",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h04:p081",
    name: "Duelist’s Advance",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
];

const entries: HeroAnnotationEntries = {
  status: statusEntries,
  range: rangeEntries,
  damage: damageEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h04:p064", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p065", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p066", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p067", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p068", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p069", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p070", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p071", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p072", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p073", hero: 0, monster: 3, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p074", hero: 0, monster: 3, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p075", hero: 0, monster: 3, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p076", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p077", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p078", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p079", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p080", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p081", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p082", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p083", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h04:p084", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h04:p064", effect: "damage" },
    { id: "hero_skill:core:h04:p065", effect: "damage" },
    { id: "hero_skill:core:h04:p066", effect: "damage" },
    { id: "hero_skill:core:h04:p067", effect: "damage" },
    { id: "hero_skill:core:h04:p068", effect: "damage" },
    { id: "hero_skill:core:h04:p069", effect: "damage" },
    { id: "hero_skill:core:h04:p070", effect: "damage" },
    { id: "hero_skill:core:h04:p071", effect: "damage" },
    { id: "hero_skill:core:h04:p072", effect: "damage" },
    { id: "hero_skill:core:h04:p073", effect: "damage" },
    { id: "hero_skill:core:h04:p074", effect: "damage" },
    { id: "hero_skill:core:h04:p075", effect: "damage" },
    { id: "hero_skill:core:h04:p076", effect: "damage" },
    { id: "hero_skill:core:h04:p077", effect: "damage" },
    { id: "hero_skill:core:h04:p078", effect: "damage" },
    { id: "hero_skill:core:h04:p079", effect: "damage" },
    { id: "hero_skill:core:h04:p080", effect: "damage" },
    { id: "hero_skill:core:h04:p081", effect: "damage" },
    { id: "hero_skill:core:h04:p082", effect: "damage" },
    { id: "hero_skill:core:h04:p083", effect: "damage" },
    { id: "hero_skill:core:h04:p084", effect: "damage" },
  ],
};

export const h04 = defineHeroModule({
  id: "h04",
  hero: "HIGHWAYMAN",
  entries,
  fixes: null,
});
