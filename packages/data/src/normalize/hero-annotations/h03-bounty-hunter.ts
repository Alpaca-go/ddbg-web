import type { CoreHigherSkillRow } from "./types";

/** 核心盒 Bounty Hunter II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p044",
    name: "Collect Bounty",
    level: 2,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 2,
          condition: "human",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 3,
          condition: "marked",
          source: "print_front",
        },
      ],
    },
  },
  {
    id: "hero_skill:p045",
    name: "Collect Bounty",
    level: 3,
    original: ["{target_effects} {damage} +2 vs Humans", "{damage} +3 vs {mark}"],
    lines: ["{target_effects} {damage} +2 vs Humans", "{target_effects} {damage} +3 vs {mark}"],
    flags: {
      verified_damage_bonuses: [
        {
          lineIndex: 0,
          amount: 2,
          condition: "human",
          source: "print_front",
        },
        {
          lineIndex: 1,
          amount: 3,
          condition: "marked",
          source: "print_front",
        },
      ],
    },
  },
  {
    id: "hero_skill:p047",
    name: "Mark for Death",
    level: 2,
    original: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    lines: ["{target_effects} {mark} 3t, {debuff} 2t", "{self_effects} Self {buff} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 3,
        },
        {
          lineIndex: 0,
          segmentIndex: 4,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
      ],
      verified_range: {
        min: 0,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p050",
    name: "Come Hither",
    level: 2,
    original: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 2t, {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "mark",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p051",
    name: "Come Hither",
    level: 3,
    original: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
    lines: ["{target_effects} {mark} 3t, {shuffle} Pull 2"],
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
    },
  },
  {
    id: "hero_skill:p053",
    name: "Uppercut",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
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
    id: "hero_skill:p054",
    name: "Uppercut",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2"],
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
    id: "hero_skill:p056",
    name: "Flashbang",
    level: 2,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 2 or {shuffle} Pull 2"],
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p057",
    name: "Flashbang",
    level: 3,
    original: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
    lines: ["{target_effects} {stun} 1t, {shuffle} Push 3 or {shuffle} Pull 3"],
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p059",
    name: "Finish Him",
    level: 2,
    original: ["{target_effects} {damage} +3 vs {stun}"],
    lines: ["{target_effects} {damage} +3 vs {stun}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 3,
        condition: "stunned",
        source: "print_front",
      },
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p060",
    name: "Finish Him",
    level: 3,
    original: ["{target_effects} {damage} +4 vs {stun}"],
    lines: ["{target_effects} {damage} +4 vs {stun}"],
    flags: {
      verified_damage_bonus: {
        lineIndex: 0,
        amount: 4,
        condition: "stunned",
        source: "print_front",
      },
      verified_range: {
        min: 0,
        max: 1,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p062",
    name: "Caltrops",
    level: 2,
    original: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    lines: ["{target_effects} 3 {bleed} 2t, {debuff} 2t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 2,
          amount: 3,
        },
        {
          lineIndex: 0,
          segmentIndex: 4,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
      ],
    },
  },
];
