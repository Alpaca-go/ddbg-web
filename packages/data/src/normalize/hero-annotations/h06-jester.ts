import type { CoreHigherSkillRow } from "./types";

/** 核心盒 Jester II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p110",
    name: "Harvest",
    level: 2,
    original: ["{target_effects} 2 {bleed} 3t"],
    lines: ["{target_effects} 2 {bleed} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p111",
    name: "Harvest",
    level: 3,
    original: ["{target_effects} 3 {bleed} 3t"],
    lines: ["{target_effects} 3 {bleed} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:p116",
    name: "Solo",
    level: 2,
    original: ["{target_effects} {stun} 1t", "{self_effects} Self {buff} 2t, {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 1t", "{self_effects} Self {buff} 2t, {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
    },
  },
  {
    id: "hero_skill:p117",
    name: "Solo",
    level: 3,
    original: ["{target_effects} {stun} 2t", "{self_effects} Self {buff} 3t, {shuffle} Pull 2"],
    lines: ["{target_effects} {stun} 2t", "{self_effects} Self {buff} 3t, {shuffle} Pull 2"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
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
    },
  },
  {
    id: "hero_skill:p119",
    name: "Battle Ballad",
    level: 2,
    original: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 3t",
      "{target_effects} {buff} 3t",
    ],
    lines: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 3t",
      "{target_effects} {buff} 3t",
    ],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 3,
        },
      ],
      verified_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p120",
    name: "Battle Ballad",
    level: 3,
    original: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 4t",
      "{target_effects} {buff} 4t",
    ],
    lines: [
      "{range} 1 {target_hero} {target_hero} {target_hero}",
      "{self_effects} Self {buff} 4t",
      "{target_effects} {buff} 4t",
    ],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 4,
        },
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "buff",
          duration: 4,
        },
      ],
      verified_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p125",
    name: "Slice Off",
    level: 2,
    original: ["{target_effects} 3 {bleed} 2t"],
    lines: ["{target_effects} 3 {bleed} 2t"],
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
      ],
    },
  },
  {
    id: "hero_skill:p126",
    name: "Slice Off",
    level: 3,
    original: ["{target_effects} 3 {bleed} 3t"],
    lines: ["{target_effects} 3 {bleed} 3t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "bleed",
          duration: 3,
          amount: 3,
        },
      ],
    },
  },
  {
    id: "hero_skill:p107",
    name: "Dirk Stab",
    level: 2,
    original: ["{self_effects} Self {shuffle} Pull 1,", "Ignores {guard}"],
    lines: ["{self_effects} Self {shuffle} Pull 1", "Ignores {guard}"],
    flags: {},
  },
  {
    id: "hero_skill:p108",
    name: "Dirk Stab",
    level: 3,
    original: ["{self_effects} Self {shuffle} Pull 1,", "Ignores {guard}"],
    lines: ["{self_effects} Self {shuffle} Pull 1", "Ignores {guard}"],
    flags: {},
  },
];
