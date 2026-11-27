import type { AbominationProjectionRow } from "./types";

/** R-212 / 单元 6：Absolution、Rake、Rage、Slam、Transform 的投影结果（已含行拆分）。 */
export const ABOMINATION_PROJECTIONS: readonly AbominationProjectionRow[] = [
  {
    id: "hero_skill:core:h11:p211",
    name: "Manacles",
    level: 1,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p212",
    name: "Manacles",
    level: 2,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p213",
    name: "Manacles",
    level: 3,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "stun",
          duration: 1,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p214",
    name: "Beast’s Bile",
    level: 1,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 2,
          amount: 2,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p215",
    name: "Beast’s Bile",
    level: 2,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 2,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p216",
    name: "Beast’s Bile",
    level: 3,
    front: {
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "target",
          kind: "blight",
          duration: 3,
          amount: 3,
        },
      ],
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p217",
    name: "Absolution",
    level: 1,
    front: {
      selfStress: {
        lineIndex: 0,
        amount: -1,
      },
      selfRange: true,
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p218",
    name: "Absolution",
    level: 2,
    front: {
      selfStress: {
        lineIndex: 0,
        amount: -1,
      },
      selfRange: true,
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p219",
    name: "Absolution",
    level: 3,
    front: {
      selfStress: {
        lineIndex: 0,
        amount: -1,
      },
      selfRange: true,
      requiredForm: "human",
    },
  },
  {
    id: "hero_skill:core:h11:p220",
    name: "Transform to Beast",
    level: 1,
    front: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Beast",
        "{self_effects} Self {buff} 2t",
        "{self_effects} Self {heal} 4",
        "{self_effects} Self {stress} +2",
      ],
      printedLabels: [],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 4,
        amount: 2,
      },
      selfHeal: {
        lineIndex: 3,
        amount: 4,
      },
      selfRange: true,
      alliesStress: 2,
      requiredForm: "human",
    },
    back: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Human",
        "{self_effects} Self {debuff} 3t",
        "{self_effects} Self {stress} -1",
      ],
      printedLabels: [],
      topIcons: [
        "stance_support_lit",
        "stance_ranged_lit",
        "stance_defensive_lit",
        "stance_aggressive_lit",
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "debuff",
          duration: 3,
        },
      ],
      selfStress: {
        lineIndex: 3,
        amount: -1,
      },
      selfRange: true,
      alliesStress: -1,
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p221",
    name: "Transform to Beast",
    level: 2,
    front: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Beast",
        "{self_effects} Self {buff} 3t",
        "{self_effects} Self {heal} 6",
      ],
      printedLabels: [],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
      ],
      selfHeal: {
        lineIndex: 3,
        amount: 6,
      },
      selfRange: true,
      alliesStress: 2,
      requiredForm: "human",
    },
    back: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Human",
        "{self_effects} Self {debuff} 2t",
        "{self_effects} Self {stress} -1",
      ],
      printedLabels: [],
      topIcons: [
        "stance_support_lit",
        "stance_ranged_lit",
        "stance_defensive_lit",
        "stance_aggressive_lit",
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "debuff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 3,
        amount: -1,
      },
      selfRange: true,
      alliesStress: -1,
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p222",
    name: "Transform to Beast",
    level: 3,
    front: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Beast",
        "{self_effects} Self {buff} 3t",
        "{self_effects} Self {heal} 8",
      ],
      printedLabels: [],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 3,
        },
      ],
      selfHeal: {
        lineIndex: 3,
        amount: 8,
      },
      selfRange: true,
      alliesStress: 2,
      requiredForm: "human",
    },
    back: {
      lines: [
        "{range} Self",
        "{self_effects} Self Change: Human",
        "{self_effects} Self {debuff} 1t",
        "{self_effects} Self {stress} -1",
      ],
      printedLabels: [],
      topIcons: [
        "stance_support_lit",
        "stance_ranged_lit",
        "stance_defensive_lit",
        "stance_aggressive_lit",
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "self",
          kind: "debuff",
          duration: 1,
        },
      ],
      selfStress: {
        lineIndex: 3,
        amount: -1,
      },
      selfRange: true,
      alliesStress: -1,
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p223",
    name: "Rake",
    level: 1,
    front: {
      lines: ["{self_effects} Self {buff} 2t", "{self_effects} Self {stress} +1"],
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p224",
    name: "Rake",
    level: 2,
    front: {
      lines: ["{self_effects} Self {buff} 2t", "{self_effects} Self {stress} +1"],
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p225",
    name: "Rake",
    level: 3,
    front: {
      lines: ["{self_effects} Self {buff} 2t", "{self_effects} Self {stress} +1"],
      statuses: [
        {
          lineIndex: 0,
          segmentIndex: 2,
          scope: "self",
          kind: "buff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p226",
    name: "Rage",
    level: 1,
    front: {
      lines: ["{self_effects} Self {stress} +1"],
      selfStress: {
        lineIndex: 0,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p227",
    name: "Rage",
    level: 2,
    front: {
      lines: ["{self_effects} Self {stress} +1"],
      selfStress: {
        lineIndex: 0,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p228",
    name: "Rage",
    level: 3,
    front: {
      lines: ["{self_effects} Self {stress} +1"],
      selfStress: {
        lineIndex: 0,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p229",
    name: "Slam",
    level: 1,
    printedLines: [
      "{self_effects} Self {shuffle} Pull 1, {stress} +1",
      "{target_effects} {shuffle} Push 2, {debuff} 1t",
    ],
    front: {
      lines: [
        "{self_effects} Self {shuffle} Pull 1",
        "{self_effects} Self {stress} +1",
        "{target_effects} {debuff} 1t, {shuffle} Push 2",
      ],
      shuffles: [
        { lineIndex: 0, scope: "self", text: "Pull 1" },
        { lineIndex: 2, scope: "target", text: "Push 2" },
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 1,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p230",
    name: "Slam",
    level: 2,
    printedLines: [
      "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
    ],
    front: {
      lines: [
        "{self_effects} Self {shuffle} Pull 1",
        "{self_effects} Self {stress} +1",
        "{target_effects} {debuff} 2t, {shuffle} Push 2",
      ],
      shuffles: [
        { lineIndex: 0, scope: "self", text: "Pull 1" },
        { lineIndex: 2, scope: "target", text: "Push 2" },
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
  {
    id: "hero_skill:core:h11:p231",
    name: "Slam",
    level: 3,
    printedLines: [
      "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
    ],
    front: {
      lines: [
        "{self_effects} Self {shuffle} Pull 1",
        "{self_effects} Self {stress} +1",
        "{target_effects} {debuff} 2t, {shuffle} Push 2",
      ],
      shuffles: [
        { lineIndex: 0, scope: "self", text: "Pull 1" },
        { lineIndex: 2, scope: "target", text: "Push 2" },
      ],
      statuses: [
        {
          lineIndex: 2,
          segmentIndex: 2,
          scope: "target",
          kind: "debuff",
          duration: 2,
        },
      ],
      selfStress: {
        lineIndex: 1,
        amount: 1,
      },
      requiredForm: "beast",
    },
  },
] as unknown as readonly AbominationProjectionRow[];
