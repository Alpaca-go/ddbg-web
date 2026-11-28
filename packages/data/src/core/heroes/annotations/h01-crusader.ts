import type {
  DirectAttackEntry,
  HealSupportEntry,
  BuffGuardEntry,
  HeroAnnotationEntries,
  StatusEffectEntry,
  RangeEntry,
  SupportEffectEntry,
  DamageEntry,
  SelfEffectEntry,
  ShuffleEntry,
} from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:core:h01:p007",
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
    id: "hero_skill:core:h01:p008",
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
    id: "hero_skill:core:h01:p009",
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
    id: "hero_skill:core:h01:p010",
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
    id: "hero_skill:core:h01:p011",
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
    id: "hero_skill:core:h01:p012",
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
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:core:h01:p013",
    name: "Battle Heal",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:core:h01:p014",
    name: "Battle Heal",
    level: 2,
    min: 0,
    max: 1,
  },
];

/** 完整 SKILLS_FRONT p019–021：只附已复核数字，不改原始 numeric=null。 */
const supportEntries: readonly SupportEffectEntry[] = [
  {
    id: "hero_skill:core:h01:p019",
    name: "Inspiring Cry",
    level: 1,
    page: 19,
    lineIndex: 1,
    targetSignature: "{range}0{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
  {
    id: "hero_skill:core:h01:p020",
    name: "Inspiring Cry",
    level: 2,
    page: 20,
    lineIndex: 2,
    targetSignature: "{range}1{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
  {
    id: "hero_skill:core:h01:p021",
    name: "Inspiring Cry",
    level: 3,
    page: 21,
    lineIndex: 2,
    targetSignature: "{range}1{target_hero}{target_hero}",
    effectSignature: "{target_effects}{damage_or_heal_combined_marker}{heal}1,{stress}-1,{light}+1",
    effects: { heal: 1, stress: -1, light: 1 },
  },
];

/** 已复核条件伤害（只录已命名 damage 图标与明文条件）。 */
const damageEntries: readonly DamageEntry[] = [
  {
    id: "hero_skill:core:h01:p001",
    name: "Smite",
    level: 1,
    page: 1,
    lineIndex: 0,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h01:p002",
    name: "Smite",
    level: 2,
    page: 2,
    lineIndex: 0,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h01:p003",
    name: "Smite",
    level: 3,
    page: 3,
    lineIndex: 0,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h01:p016",
    name: "Holy Lance",
    level: 1,
    page: 16,
    lineIndex: 1,
    amount: 1,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h01:p017",
    name: "Holy Lance",
    level: 2,
    page: 17,
    lineIndex: 1,
    amount: 2,
    condition: "unholy",
    suffix: "Unholy",
  },
  {
    id: "hero_skill:core:h01:p018",
    name: "Holy Lance",
    level: 3,
    page: 18,
    lineIndex: 1,
    amount: 3,
    condition: "unholy",
    suffix: "Unholy",
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
const selfEffectEntries: readonly SelfEffectEntry[] = [
  {
    id: "hero_skill:core:h01:p015",
    name: "Battle Heal",
    level: 3,
    lineIndex: 0,
    kind: "heal",
    amount: 5,
  },
  {
    id: "hero_skill:core:h01:p020",
    name: "Inspiring Cry",
    level: 2,
    lineIndex: 1,
    kind: "heal",
    amount: 1,
  },
  {
    id: "hero_skill:core:h01:p020",
    name: "Inspiring Cry",
    level: 2,
    lineIndex: 1,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h01:p021",
    name: "Inspiring Cry",
    level: 3,
    lineIndex: 1,
    kind: "heal",
    amount: 1,
  },
  {
    id: "hero_skill:core:h01:p021",
    name: "Inspiring Cry",
    level: 3,
    lineIndex: 1,
    kind: "stress",
    amount: -1,
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h01:p016",
    name: "Holy Lance",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h01:p017",
    name: "Holy Lance",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h01:p018",
    name: "Holy Lance",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
];

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h01:p001",
    name: "Smite",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 7 },
    critical: { threshold: 0, damage: 13 },
  },
  {
    id: "hero_skill:core:h01:p002",
    name: "Smite",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 9 },
    critical: { threshold: 0, damage: 16 },
  },
  {
    id: "hero_skill:core:h01:p003",
    name: "Smite",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 11 },
    critical: { threshold: 1, damage: 19 },
  },
  {
    id: "hero_skill:core:h01:p004",
    name: "Zealous Accusation",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 0, damage: 9 },
  },
  {
    id: "hero_skill:core:h01:p005",
    name: "Zealous Accusation",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 10, damage: 6 },
    critical: { threshold: 0, damage: 11 },
  },
  {
    id: "hero_skill:core:h01:p006",
    name: "Zealous Accusation",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 7 },
    critical: { threshold: 1, damage: 12 },
  },
  {
    id: "hero_skill:core:h01:p007",
    name: "Stunning Blow",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 4 },
    critical: { threshold: 0, damage: 8 },
  },
  {
    id: "hero_skill:core:h01:p008",
    name: "Stunning Blow",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 5 },
    critical: { threshold: 0, damage: 9 },
  },
  {
    id: "hero_skill:core:h01:p009",
    name: "Stunning Blow",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 6 },
    critical: { threshold: 1, damage: 10 },
  },
  {
    id: "hero_skill:core:h01:p016",
    name: "Holy Lance",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 7 },
    critical: { threshold: 1, damage: 13 },
  },
  {
    id: "hero_skill:core:h01:p017",
    name: "Holy Lance",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 9 },
    critical: { threshold: 1, damage: 16 },
  },
  {
    id: "hero_skill:core:h01:p018",
    name: "Holy Lance",
    stances: ["support", "ranged"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 11 },
    critical: { threshold: 2, damage: 19 },
  },
];

const healSupportEntries: readonly HealSupportEntry[] = [
  {
    id: "hero_skill:core:h01:p013",
    name: "Battle Heal",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    rangeMinimum: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 12, heal: 2 },
    critical: { threshold: 2, heal: 4 },
  },
  {
    id: "hero_skill:core:h01:p014",
    name: "Battle Heal",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    rangeMinimum: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 14, heal: 3 },
    critical: { threshold: 2, heal: 5 },
  },
  {
    id: "hero_skill:core:h01:p015",
    name: "Battle Heal",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 16, heal: 4 },
    critical: { threshold: 2, heal: 6 },
  },
  {
    id: "hero_skill:core:h01:p019",
    name: "Inspiring Cry",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 0,
    heroTargets: 1,
  },
  {
    id: "hero_skill:core:h01:p020",
    name: "Inspiring Cry",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    heroTargets: 1,
  },
  {
    id: "hero_skill:core:h01:p021",
    name: "Inspiring Cry",
    stances: ["support", "ranged", "defensive", "aggressive"],
    range: 1,
    heroTargets: 2,
  },
];

const buffGuardEntries: readonly BuffGuardEntry[] = [
  {
    id: "hero_skill:core:h01:p010",
    name: "Bulwark of Faith",
    stances: ["defensive", "aggressive"],
    selfRange: true,
    heroTargets: 0,
  },
  {
    id: "hero_skill:core:h01:p011",
    name: "Bulwark of Faith",
    stances: ["defensive", "aggressive"],
    selfRange: true,
    heroTargets: 0,
  },
  {
    id: "hero_skill:core:h01:p012",
    name: "Bulwark of Faith",
    stances: ["defensive", "aggressive"],
    selfRange: true,
    heroTargets: 0,
  },
];

const entries: HeroAnnotationEntries = {
  buffGuard: buffGuardEntries,
  healSupport: healSupportEntries,
  directAttack: directAttackEntries,
  status: statusEntries,
  range: rangeEntries,
  support: supportEntries,
  damage: damageEntries,
  self: selfEffectEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h01:p010", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h01:p011", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h01:p012", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h01:p013", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h01:p014", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h01:p015", hero: 1, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h01:p013", effect: "heal" },
    { id: "hero_skill:core:h01:p014", effect: "heal" },
    { id: "hero_skill:core:h01:p015", effect: "heal" },
  ],
};

export const h01 = defineHeroModule({
  id: "h01",
  hero: "CRUSADER",
  entries,
  fixes: null,
});
