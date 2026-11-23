import type { CoreHigherSkillRow, StatusEffectEntry, RangeEntry, SelfEffectEntry } from "./types";

/** 核心盒 Abomination II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p212",
    name: "Manacles",
    level: 2,
    original: ["{target_effects} {stun} 1t"],
    lines: ["{target_effects} {stun} 1t"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p213",
    name: "Manacles",
    level: 3,
    original: ["{target_effects} {stun} 1t"],
    lines: ["{target_effects} {stun} 1t"],
    flags: {
      verified_status_effects: [
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
    id: "hero_skill:p215",
    name: "Beast’s Bile",
    level: 2,
    original: ["{target_effects} 2 {blight} 3t"],
    lines: ["{target_effects} 2 {blight} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 2,
        },
      ],
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p216",
    name: "Beast’s Bile",
    level: 3,
    original: ["{target_effects} 3 {blight} 3t"],
    lines: ["{target_effects} 3 {blight} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 3,
        },
      ],
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  {
    id: "hero_skill:p211",
    name: "Manacles",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  {
    id: "hero_skill:p214",
    name: "Beast’s Bile",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 2t",
    effects: [{ kind: "blight", amount: 2, duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
export const rangeEntries: readonly RangeEntry[] = [
  // R-207，已逐卡核对的 I 级区间。火枪手与弩手按 Q-185 对齐。
  {
    id: "hero_skill:p214",
    name: "Beast’s Bile",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
export const selfEffectEntries: readonly SelfEffectEntry[] = [
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
