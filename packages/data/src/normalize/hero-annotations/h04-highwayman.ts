import type { StatusEffectEntry, RangeEntry, DamageEntry } from "./types";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p073",
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
    id: "hero_skill:p074",
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
    id: "hero_skill:p075",
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
    id: "hero_skill:p076",
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
    id: "hero_skill:p077",
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
    id: "hero_skill:p078",
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
    id: "hero_skill:p079",
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
    id: "hero_skill:p080",
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
    id: "hero_skill:p081",
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
    id: "hero_skill:p082",
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
    id: "hero_skill:p083",
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
    id: "hero_skill:p084",
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
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p067",
    name: "Pistol Shot",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p068",
    name: "Pistol Shot",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p069",
    name: "Pistol Shot",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p073",
    name: "Grapeshot Blast",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p074",
    name: "Grapeshot Blast",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p075",
    name: "Grapeshot Blast",
    level: 3,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p076",
    name: "Tracking Shot",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p077",
    name: "Tracking Shot",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p078",
    name: "Tracking Shot",
    level: 3,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
export const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:p067",
    name: "Pistol Shot",
    level: 1,
    page: 67,
    lineIndex: 0,
    amount: 2,
    condition: "marked",
    suffix: "{mark}",
  },
  {
    id: "hero_skill:p068",
    name: "Pistol Shot",
    level: 2,
    page: 68,
    lineIndex: 0,
    amount: 3,
    condition: "marked",
    suffix: "{mark}",
  },
  {
    id: "hero_skill:p069",
    name: "Pistol Shot",
    level: 3,
    page: 69,
    lineIndex: 0,
    amount: 4,
    condition: "marked",
    suffix: "{mark}",
  },
];
