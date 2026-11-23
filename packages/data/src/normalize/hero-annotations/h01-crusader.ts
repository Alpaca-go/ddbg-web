import type { StatusEffectEntry, RangeEntry, SupportEffectEntry } from "./types";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p007",
    name: "Stunning Blow",
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
    id: "hero_skill:p008",
    name: "Stunning Blow",
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
    id: "hero_skill:p009",
    name: "Stunning Blow",
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
    id: "hero_skill:p010",
    name: "Bulwark of Faith",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 2t, {mark} 3t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 2,
      },
      {
        kind: "mark",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p011",
    name: "Bulwark of Faith",
    level: 2,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 3t, {mark} 3t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 3,
      },
      {
        kind: "mark",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p012",
    name: "Bulwark of Faith",
    level: 3,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 3t, {mark} 2t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 3,
      },
      {
        kind: "mark",
        duration: 2,
      },
    ],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p013",
    name: "Battle Heal",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:p014",
    name: "Battle Heal",
    level: 2,
    min: 0,
    max: 1,
  },
];

/** 完整 SKILLS_FRONT p019–021：只附已复核数字，不改原始 numeric=null。 */
export const supportEntries: readonly SupportEffectEntry[] = [
  {
    id: "hero_skill:p019",
    name: "Inspiring Cry",
    level: 1,
    page: 19,
    lineIndex: 1,
    targetSignature: "{range}0{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
  {
    id: "hero_skill:p020",
    name: "Inspiring Cry",
    level: 2,
    page: 20,
    lineIndex: 2,
    targetSignature: "{range}1{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
  {
    id: "hero_skill:p021",
    name: "Inspiring Cry",
    level: 3,
    page: 21,
    lineIndex: 2,
    targetSignature: "{range}1{target_hero}{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
];
