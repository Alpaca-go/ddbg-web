import type { CoreHigherSkillRow, StatusEffectEntry } from "./types";

/** 核心盒 Grave Robber II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p173",
    name: "Lunge",
    level: 2,
    original: ["{self_effects} Self {shuffle} Pull 2", "{target_effects} {damage} +4 vs {blight}"],
    lines: ["{self_effects} Self {shuffle} Pull 2", "{target_effects} {damage} +4 vs {blight}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 1,
        amount: 4,
        condition: "blighted",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p174",
    name: "Lunge",
    level: 3,
    original: ["{self_effects} Self {shuffle} Pull 2", "{target_effects} {damage} +6 vs {blight}"],
    lines: ["{self_effects} Self {shuffle} Pull 2", "{target_effects} {damage} +6 vs {blight}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 1,
        amount: 6,
        condition: "blighted",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p176",
    name: "Flashing Daggers",
    level: 2,
    original: ["{target_effects} {debuff} 1t"],
    lines: ["{target_effects} {debuff} 1t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:p177",
    name: "Flashing Daggers",
    level: 3,
    original: ["{target_effects} {debuff} 2t"],
    lines: ["{target_effects} {debuff} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p179",
    name: "Shadow Fade",
    level: 2,
    original: ["{range} Self", "{self_effects} Self {buff} 3t, {shuffle} Push 2"],
    lines: ["{range} Self", "{self_effects} Self {buff} 3t, {shuffle} Push 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:p180",
    name: "Shadow Fade",
    level: 3,
    original: ["{range} Self", "{self_effects} Self {buff} 4t, {shuffle} Push 2"],
    lines: ["{range} Self", "{self_effects} Self {buff} 4t, {shuffle} Push 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 4,
        },
      ],
    },
  },
  {
    id: "hero_skill:p182",
    name: "Throw Dagger",
    level: 2,
    original: ["{target_effects} {damage} +2 vs {blight}", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs {blight}", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 2,
          condition: "blighted",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 3,
          condition: "marked",
          source: "print_front",
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
    id: "hero_skill:p183",
    name: "Throw Dagger",
    level: 3,
    original: ["{target_effects} {damage} +3 vs {blight}", "{damage} +4 vs {mark}"],
    lines: ["{target_effects} {damage} +3 vs {blight}", "{target_effects} {damage} +4 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 3,
          condition: "blighted",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 4,
          condition: "marked",
          source: "print_front",
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
    id: "hero_skill:p185",
    name: "Poison Dart",
    level: 2,
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
  {
    id: "hero_skill:p186",
    name: "Poison Dart",
    level: 3,
    original: ["{target_effects} 4 {blight} 3t"],
    lines: ["{target_effects} 4 {blight} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 4,
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
    id: "hero_skill:p188",
    name: "Toxin Trickery",
    level: 2,
    original: [
      "{range} 1 {target_hero}",
      "{self_effects} Self {buff} 2t,",
      "{target_effects} {buff} 2t,",
      "Remove {bleed} {blight}",
      "Remove {bleed} {blight}",
    ],
    lines: [
      "{range} 1 {target_hero}",
      "{self_effects} Self {buff} 2t,",
      "{target_effects} {buff} 2t,",
      "Remove {bleed} {blight}",
      "Remove {bleed} {blight}",
    ],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 2,
        },
      ],
      verified_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p189",
    name: "Toxin Trickery",
    level: 3,
    original: [
      "{range} 1 {target_hero} {target_hero}",
      "{self_effects} Self {buff} 2t,",
      "{target_effects} {buff} 2t,",
      "Remove {bleed} {blight}",
      "Remove {bleed} {blight}",
    ],
    lines: [
      "{range} 1 {target_hero} {target_hero}",
      "{self_effects} Self {buff} 2t,",
      "{target_effects} {buff} 2t,",
      "Remove {bleed} {blight}",
      "Remove {bleed} {blight}",
    ],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 2,
        },
      ],
      verified_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
];

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  // 完整FRONT p184：目标 Blight 2·3t；仅 I 级。
  {
    id: "hero_skill:p184",
    hero: "GRAVE ROBBER",
    name: "Poison Dart",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 3t",
    effects: [{ kind: "blight", amount: 2, duration: 3 }],
  },
  // 完整FRONT p178：无 Acc；射程 Self 行由 selfHeaders 计入，Buff 2t 与 Push 2 同行。
  {
    id: "hero_skill:p178",
    hero: "GRAVE ROBBER",
    name: "Shadow Fade",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t, {shuffle} Push 2",
    effects: [{ kind: "buff", duration: 2 }],
  },
  // 完整FRONT p187：无 Acc；Buff 与换行 Remove Bleed/Blight 分列，不套 hero 行数闸。
  {
    id: "hero_skill:p187",
    name: "Toxin Trickery",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t,",
    effects: [{ kind: "buff", duration: 2 }],
  },
];
