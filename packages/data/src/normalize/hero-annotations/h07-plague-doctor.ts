import type { CoreHigherSkillRow } from "./types";

/** 核心盒 Plague Doctor II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
export const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:p128",
    name: "Noxious Blast",
    level: 2,
    original: ["{target_effects} 4 {blight} 3t, {debuff} 1t"],
    lines: ["{target_effects} 4 {blight} 3t, {debuff} 1t"],
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
        {
          lineIndex: 0,
          segmentIndex: 4,
          scope: "target",
          kind: "debuff",
          duration: 1,
        },
      ],
    },
  },
  {
    id: "hero_skill:p129",
    name: "Noxious Blast",
    level: 3,
    original: ["{target_effects} 4 {blight} 3t, {debuff} 2t"],
    lines: ["{target_effects} 4 {blight} 3t, {debuff} 2t"],
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
  {
    id: "hero_skill:p131",
    name: "Plague Grenade",
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
    },
  },
  {
    id: "hero_skill:p132",
    name: "Plague Grenade",
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
    },
  },
  {
    id: "hero_skill:p134",
    name: "Blinding Gas",
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p135",
    name: "Blinding Gas",
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
      verified_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:p137",
    name: "Incision",
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
    id: "hero_skill:p138",
    name: "Incision",
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
    id: "hero_skill:p143",
    name: "Emboldening Vapours",
    level: 2,
    original: [
      "{range} 1 {target_hero}",
      "{self_effects} Self {buff} 3t",
      "{target_effects} {buff} 3t",
    ],
    lines: [
      "{range} 1 {target_hero}",
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
    id: "hero_skill:p144",
    name: "Emboldening Vapours",
    level: 3,
    original: [
      "{range} 1 {target_hero}",
      "{self_effects} Self {buff} 4t",
      "{target_effects} {buff} 4t",
    ],
    lines: [
      "{range} 1 {target_hero}",
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
    id: "hero_skill:p146",
    name: "Disorienting Blast",
    level: 2,
    original: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    lines: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 0,
          scope: "target",
          kind: "stun",
          duration: 1,
          scopeLineIndex: 0,
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
    id: "hero_skill:p147",
    name: "Disorienting Blast",
    level: 3,
    original: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    lines: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    flags: {
      verified_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 0,
          scope: "target",
          kind: "stun",
          duration: 1,
          scopeLineIndex: 0,
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
