import type { CoreHigherSkillRow, StatusEffectEntry, RangeEntry } from "./types";

/** 核心盒 Arbalest II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p149",
    name: "Sniper Shot",
    level: 2,
    original: ["{target_effects} {damage} +5 vs {mark}"],
    lines: ["{target_effects} {damage} +5 vs {mark}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 5,
        condition: "marked",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p150",
    name: "Sniper Shot",
    level: 3,
    original: ["{target_effects} {damage} +9 vs {mark}"],
    lines: ["{target_effects} {damage} +9 vs {mark}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 9,
        condition: "marked",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p152",
    name: "Suppressive Fire",
    level: 2,
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p153",
    name: "Suppressive Fire",
    level: 3,
    original: ["{target_effects} {debuff} 3t"],
    lines: ["{target_effects} {debuff} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 3,
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
    id: "hero_skill:p155",
    name: "Sniper’s Mark",
    level: 2,
    original: ["{target_effects} {mark} 3t"],
    lines: ["{target_effects} {mark} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 3,
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
    id: "hero_skill:p156",
    name: "Sniper’s Mark",
    level: 3,
    original: ["{target_effects} {mark} 4t"],
    lines: ["{target_effects} {mark} 4t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 4,
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
    id: "hero_skill:p161",
    name: "Blindfire",
    level: 2,
    original: ["{self_effects} Self {shuffle} Push 2"],
    lines: ["{self_effects} Self {shuffle} Push 2"],
    flags: {
      verified_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p162",
    name: "Blindfire",
    level: 3,
    original: ["{self_effects} Self {shuffle} Push 2"],
    lines: ["{self_effects} Self {shuffle} Push 2"],
    flags: {
      verified_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p164",
    name: "Battlefield Bandage",
    level: 2,
    original: ["{self_effects} Self {buff} 2t"],
    lines: ["{self_effects} Self {buff} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p165",
    name: "Battlefield Bandage",
    level: 3,
    original: ["{self_effects} Self {buff} 2t"],
    lines: ["{self_effects} Self {buff} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p167",
    name: "Rallying Flare",
    level: 2,
    original: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    lines: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    flags: {
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p168",
    name: "Rallying Flare",
    level: 3,
    original: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    lines: [
      "{self_effects} Self Remove {stun} {mark} {target_effects} {target_hero} : Remove {stun} {mark}",
      "{target_monster} : {debuff} 2t",
    ],
    flags: {
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
    id: "hero_skill:p151",
    name: "Suppressive Fire",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  {
    id: "hero_skill:p154",
    name: "Sniper’s Mark",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p163",
    name: "Battlefield Bandage",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t",
    effects: [{ kind: "buff", duration: 2 }],
  },
  {
    id: "hero_skill:p166",
    name: "Rallying Flare",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p167",
    name: "Rallying Flare",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p168",
    name: "Rallying Flare",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
export const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:p166",
    name: "Rallying Flare",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p167",
    name: "Rallying Flare",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p168",
    name: "Rallying Flare",
    level: 3,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p151",
    name: "Suppressive Fire",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p154",
    name: "Sniper’s Mark",
    level: 1,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:p160",
    name: "Blindfire",
    level: 1,
    min: 0,
    max: 2,
  },
  {
    id: "hero_skill:p163",
    name: "Battlefield Bandage",
    level: 1,
    min: 0,
    max: 1,
  },
];
