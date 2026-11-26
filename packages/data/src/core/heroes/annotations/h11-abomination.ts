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

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
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

const entries: HeroAnnotationEntries = {
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  self: selfEffectEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:core:h11:p211", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p212", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p213", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p214", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p215", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p216", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p217", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p218", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p219", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p220", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p221", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p222", hero: 0, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p223", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p224", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p225", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p226", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p227", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p228", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p229", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p230", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h11:p231", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h11:p211", effect: "damage" },
    { id: "hero_skill:core:h11:p212", effect: "damage" },
    { id: "hero_skill:core:h11:p213", effect: "damage" },
    { id: "hero_skill:core:h11:p214", effect: "damage" },
    { id: "hero_skill:core:h11:p215", effect: "damage" },
    { id: "hero_skill:core:h11:p216", effect: "damage" },
    { id: "hero_skill:core:h11:p217", effect: "heal" },
    { id: "hero_skill:core:h11:p218", effect: "heal" },
    { id: "hero_skill:core:h11:p219", effect: "heal" },
    { id: "hero_skill:core:h11:p223", effect: "damage" },
    { id: "hero_skill:core:h11:p224", effect: "damage" },
    { id: "hero_skill:core:h11:p225", effect: "damage" },
    { id: "hero_skill:core:h11:p226", effect: "damage" },
    { id: "hero_skill:core:h11:p227", effect: "damage" },
    { id: "hero_skill:core:h11:p228", effect: "damage" },
    { id: "hero_skill:core:h11:p229", effect: "damage" },
    { id: "hero_skill:core:h11:p230", effect: "damage" },
    { id: "hero_skill:core:h11:p231", effect: "damage" },
  ],
};

export const h11 = defineHeroModule({ id: "h11", hero: "ABOMINATION", entries });
