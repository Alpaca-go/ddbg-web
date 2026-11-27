import type { DirectAttackEntry } from "./types";
import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  SelfEffectEntry,
  ShuffleEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Abomination II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h11:p212",
    name: "Manacles",
    level: 2,
    original: ["{target_effects} {stun} 1t"],
    lines: ["{target_effects} {stun} 1t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h11:p213",
    name: "Manacles",
    level: 3,
    original: ["{target_effects} {stun} 1t"],
    lines: ["{target_effects} {stun} 1t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:core:h11:p215",
    name: "Beast’s Bile",
    level: 2,
    original: ["{target_effects} 2 {blight} 3t"],
    lines: ["{target_effects} 2 {blight} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 2,
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
    id: "hero_skill:core:h11:p216",
    name: "Beast’s Bile",
    level: 3,
    original: ["{target_effects} 3 {blight} 3t"],
    lines: ["{target_effects} 3 {blight} 3t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 3,
        },
      ],
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
    id: "hero_skill:core:h11:p211",
    name: "Manacles",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  {
    id: "hero_skill:core:h11:p214",
    name: "Beast’s Bile",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 2t",
    effects: [{ kind: "blight", amount: 2, duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  // R-207，已逐卡核对的 I 级区间。火枪手与弩手按 Q-185 对齐。
  {
    id: "hero_skill:core:h11:p214",
    name: "Beast’s Bile",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
const selfEffectEntries: readonly SelfEffectEntry[] = [
  {
    id: "hero_skill:core:h11:p217",
    name: "Absolution",
    level: 1,
    lineIndex: 0,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h11:p218",
    name: "Absolution",
    level: 2,
    lineIndex: 0,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h11:p219",
    name: "Absolution",
    level: 3,
    lineIndex: 0,
    kind: "stress",
    amount: -1,
  },
  {
    id: "hero_skill:core:h11:p223",
    name: "Rake",
    level: 1,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p224",
    name: "Rake",
    level: 2,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p225",
    name: "Rake",
    level: 3,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p226",
    name: "Rage",
    level: 1,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p227",
    name: "Rage",
    level: 2,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p228",
    name: "Rage",
    level: 3,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p229",
    name: "Slam",
    level: 1,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p230",
    name: "Slam",
    level: 2,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
  {
    id: "hero_skill:core:h11:p231",
    name: "Slam",
    level: 3,
    lineIndex: 0,
    kind: "stress",
    amount: 1,
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h11:p229",
    name: "Slam",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:core:h11:p229",
    name: "Slam",
    level: 1,
    lineIndex: 1,
    scope: "target",
    text: "Push 2",
  },
];

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h11:p229",
    name: "Slam",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 8, damage: 7 },
    critical: { threshold: 0, damage: 10 },
  },
  {
    id: "hero_skill:core:h11:p230",
    name: "Slam",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 9 },
    critical: { threshold: 0, damage: 14 },
  },
  {
    id: "hero_skill:core:h11:p231",
    name: "Slam",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 12 },
    critical: { threshold: 0, damage: 17 },
  },
  {
    id: "hero_skill:core:h11:p211",
    name: "Manacles",
    stances: ["ranged", "defensive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 4 },
    critical: { threshold: 0, damage: 6 },
  },
  {
    id: "hero_skill:core:h11:p212",
    name: "Manacles",
    stances: ["ranged", "defensive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 5 },
    critical: { threshold: 0, damage: 8 },
  },
  {
    id: "hero_skill:core:h11:p213",
    name: "Manacles",
    stances: ["ranged", "defensive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 7 },
    critical: { threshold: 0, damage: 11 },
  },
  {
    id: "hero_skill:core:h11:p214",
    name: "Beast’s Bile",
    stances: ["ranged", "defensive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 10, damage: 2 },
    critical: { threshold: 0, damage: 3 },
  },
  {
    id: "hero_skill:core:h11:p215",
    name: "Beast’s Bile",
    stances: ["ranged", "defensive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 3 },
    critical: { threshold: 0, damage: 5 },
  },
  {
    id: "hero_skill:core:h11:p216",
    name: "Beast’s Bile",
    stances: ["ranged", "defensive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 4 },
    critical: { threshold: 0, damage: 6 },
  },
  {
    id: "hero_skill:core:h11:p223",
    name: "Rake",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 2,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 0, damage: 9 },
  },
  {
    id: "hero_skill:core:h11:p224",
    name: "Rake",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 2,
    hit: { threshold: 10, damage: 7 },
    critical: { threshold: 0, damage: 12 },
  },
  {
    id: "hero_skill:core:h11:p225",
    name: "Rake",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 2,
    hit: { threshold: 11, damage: 9 },
    critical: { threshold: 0, damage: 14 },
  },
  {
    id: "hero_skill:core:h11:p226",
    name: "Rage",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 9 },
    critical: { threshold: 1, damage: 12 },
  },
  {
    id: "hero_skill:core:h11:p227",
    name: "Rage",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 11 },
    critical: { threshold: 1, damage: 16 },
  },
  {
    id: "hero_skill:core:h11:p228",
    name: "Rage",
    stances: ["defensive", "aggressive"],
    range: 0,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 15 },
    critical: { threshold: 1, damage: 21 },
  },
];

const entries: HeroAnnotationEntries = {
  directAttack: directAttackEntries,
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  self: selfEffectEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h11:p217", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p218", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p219", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p220", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p221", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p222", hero: 0, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h11:p217", effect: "heal" },
    { id: "hero_skill:core:h11:p218", effect: "heal" },
    { id: "hero_skill:core:h11:p219", effect: "heal" },
  ],
};

export const h11 = defineHeroModule({
  id: "h11",
  hero: "ABOMINATION",
  entries,
  fixes: null,
});
