import type { CoreHigherSkillRow } from "./types";

/** 核心盒 Occultist II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p191",
    name: "Sacrificial Stab",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p192",
    name: "Sacrificial Stab",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p194",
    name: "Abyssal Artillery",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Eldritch"],
    lines: ["{target_effects} {damage} +2 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 2,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p195",
    name: "Abyssal Artillery",
    level: 3,
    original: ["{target_effects} {damage} +3 vs Eldritch"],
    lines: ["{target_effects} {damage} +3 vs Eldritch"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "eldritch",
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p197",
    name: "Weakening Curse",
    level: 2,
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
    id: "hero_skill:p198",
    name: "Weakening Curse",
    level: 3,
    original: ["{target_effects} {debuff} 4t"],
    lines: ["{target_effects} {debuff} 4t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
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
    id: "hero_skill:p200",
    name: "Wyrd Reconstruction",
    level: 2,
    original: ["{target_effects} 1 {bleed} 3t"],
    lines: ["{target_effects} 1 {bleed} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 1,
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
    id: "hero_skill:p201",
    name: "Wyrd Reconstruction",
    level: 3,
    original: ["{target_effects} 2 {bleed} 2t"],
    lines: ["{target_effects} 2 {bleed} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 2,
          amount: 2,
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
    id: "hero_skill:p203",
    name: "Vulnerability Hex",
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
    id: "hero_skill:p204",
    name: "Vulnerability Hex",
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
    id: "hero_skill:p206",
    name: "Hands from the Abyss",
    level: 2,
    original: ["{target_effects} {stun} 2t, {light} -1"],
    lines: ["{target_effects} {stun} 2t, {light} -1"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p207",
    name: "Hands from the Abyss",
    level: 3,
    original: ["{target_effects} {stun} 3t, {light} -1"],
    lines: ["{target_effects} {stun} 3t, {light} -1"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 3,
        },
      ],
    },
  },
];
