import type { StatusEffectEntry, RangeEntry, DamageEntry } from "./types";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p091",
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
    id: "hero_skill:p092",
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
    id: "hero_skill:p093",
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
    id: "hero_skill:p100",
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
    id: "hero_skill:p101",
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
    id: "hero_skill:p102",
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
    id: "hero_skill:p103",
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
    id: "hero_skill:p104",
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
    id: "hero_skill:p105",
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
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p088",
    name: "Judgement",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p089",
    name: "Judgement",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p090",
    name: "Judgement",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p094",
    name: "Divine Grace",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p095",
    name: "Divine Grace",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p096",
    name: "Divine Grace",
    level: 3,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p100",
    name: "Illumination",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p101",
    name: "Illumination",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p102",
    name: "Illumination",
    level: 3,
    min: 1,
    max: 2,
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
export const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:p085",
    name: "Mace Bash",
    level: 1,
    page: 85,
    lineIndex: 0,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:p086",
    name: "Mace Bash",
    level: 2,
    page: 86,
    lineIndex: 0,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:p087",
    name: "Mace Bash",
    level: 3,
    page: 87,
    lineIndex: 0,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:p103",
    name: "Hand of Light",
    level: 1,
    page: 103,
    lineIndex: 1,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:p104",
    name: "Hand of Light",
    level: 2,
    page: 104,
    lineIndex: 1,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:p105",
    name: "Hand of Light",
    level: 3,
    page: 105,
    lineIndex: 1,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
];
