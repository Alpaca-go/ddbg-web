import type { StatusEffectEntry, RangeEntry, DamageEntry, SelfEffectEntry } from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h05:p091",
    name: "Dazzling Light",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p092",
    name: "Dazzling Light",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p093",
    name: "Dazzling Light",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p100",
    name: "Illumination",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p101",
    name: "Illumination",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p102",
    name: "Illumination",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 3t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:core:h05:p103",
    name: "Hand of Light",
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
    id: "hero_skill:core:h05:p104",
    name: "Hand of Light",
    level: 2,
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
    id: "hero_skill:core:h05:p105",
    name: "Hand of Light",
    level: 3,
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
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h05:p088",
    name: "Judgement",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h05:p089",
    name: "Judgement",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h05:p090",
    name: "Judgement",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h05:p094",
    name: "Divine Grace",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h05:p095",
    name: "Divine Grace",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h05:p096",
    name: "Divine Grace",
    level: 3,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h05:p100",
    name: "Illumination",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h05:p101",
    name: "Illumination",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:core:h05:p102",
    name: "Illumination",
    level: 3,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h05:p085",
    name: "Mace Bash",
    level: 1,
    page: 85,
    lineIndex: 0,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h05:p086",
    name: "Mace Bash",
    level: 2,
    page: 86,
    lineIndex: 0,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h05:p087",
    name: "Mace Bash",
    level: 3,
    page: 87,
    lineIndex: 0,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h05:p103",
    name: "Hand of Light",
    level: 1,
    page: 103,
    lineIndex: 1,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h05:p104",
    name: "Hand of Light",
    level: 2,
    page: 104,
    lineIndex: 1,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h05:p105",
    name: "Hand of Light",
    level: 3,
    page: 105,
    lineIndex: 1,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
const selfEffectEntries: readonly SelfEffectEntry[] = [
  {
    id: "hero_skill:core:h05:p088",
    name: "Judgement",
    level: 1,
    lineIndex: 0,
    kind: "heal",
    amount: 2,
  },
  {
    id: "hero_skill:core:h05:p089",
    name: "Judgement",
    level: 2,
    lineIndex: 0,
    kind: "heal",
    amount: 3,
  },
  {
    id: "hero_skill:core:h05:p090",
    name: "Judgement",
    level: 3,
    lineIndex: 0,
    kind: "heal",
    amount: 4,
  },
  {
    id: "hero_skill:core:h05:p097",
    name: "Divine Comfort",
    level: 1,
    lineIndex: 0,
    kind: "heal",
    amount: 2,
  },
  {
    id: "hero_skill:core:h05:p098",
    name: "Divine Comfort",
    level: 2,
    lineIndex: 0,
    kind: "heal",
    amount: 3,
  },
  {
    id: "hero_skill:core:h05:p099",
    name: "Divine Comfort",
    level: 3,
    lineIndex: 0,
    kind: "heal",
    amount: 4,
  },
];

const entries: HeroAnnotationEntries = {
  status: statusEntries,
  range: rangeEntries,
  damage: damageEntries,
  self: selfEffectEntries,
  targetCount: [
    { id: "hero_skill:core:h05:p085", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p086", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p087", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p088", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p089", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p090", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p091", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p092", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p093", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p094", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p095", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p096", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p097", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p098", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p099", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p100", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p101", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p102", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p103", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p104", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h05:p105", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h05:p085", effect: "damage" },
    { id: "hero_skill:core:h05:p086", effect: "damage" },
    { id: "hero_skill:core:h05:p087", effect: "damage" },
    { id: "hero_skill:core:h05:p088", effect: "damage" },
    { id: "hero_skill:core:h05:p089", effect: "damage" },
    { id: "hero_skill:core:h05:p090", effect: "damage" },
    { id: "hero_skill:core:h05:p091", effect: "damage" },
    { id: "hero_skill:core:h05:p092", effect: "damage" },
    { id: "hero_skill:core:h05:p093", effect: "damage" },
    { id: "hero_skill:core:h05:p094", effect: "heal" },
    { id: "hero_skill:core:h05:p095", effect: "heal" },
    { id: "hero_skill:core:h05:p096", effect: "heal" },
    { id: "hero_skill:core:h05:p097", effect: "heal" },
    { id: "hero_skill:core:h05:p098", effect: "heal" },
    { id: "hero_skill:core:h05:p099", effect: "heal" },
    { id: "hero_skill:core:h05:p100", effect: "damage" },
    { id: "hero_skill:core:h05:p101", effect: "damage" },
    { id: "hero_skill:core:h05:p102", effect: "damage" },
    { id: "hero_skill:core:h05:p103", effect: "damage" },
    { id: "hero_skill:core:h05:p104", effect: "damage" },
    { id: "hero_skill:core:h05:p105", effect: "damage" },
  ],
};

export const h05 = defineHeroModule({ id: "h05", hero: "VESTAL", entries });
