import type {
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  SelfEffectEntry,
  ShuffleEntry,
  RemovalEntry,
} from "./types";

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

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
export const statusEntries: readonly StatusEffectEntry[] = [
  // 完整FRONT p145：目标标记/可选位移在第一行，Stun续行不重复印目标标记。
  {
    id: "hero_skill:p145",
    hero: "PLAGUE DOCTOR",
    name: "Disorienting Blast",
    level: 1,
    lineIndex: 1,
    scope: "target",
    scopeLine: { index: 0, signature: "{target_effects} {shuffle} Push 2 or Pull 2" },
    signature: "{stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  // 完整FRONT p142：四姿态，无Acc；第一行为射程/目标，第二行为Buff。
  {
    id: "hero_skill:p142",
    hero: "PLAGUE DOCTOR",
    name: "Emboldening Vapours",
    level: 1,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 0 {target_hero}",
    signature: "{target_effects} {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  // 完整FRONT p130/p133，R19–21；双目标共用骰、各自结算状态。
  {
    id: "hero_skill:p130",
    hero: "PLAGUE DOCTOR",
    name: "Plague Grenade",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {blight} 2t",
    effects: [{ kind: "blight", amount: 3, duration: 2 }],
  },
  {
    id: "hero_skill:p133",
    hero: "PLAGUE DOCTOR",
    name: "Blinding Gas",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  // 完整FRONT p127/p136，R19–21；仅I级，不从未命名numeric推断时长。
  {
    id: "hero_skill:p127",
    hero: "PLAGUE DOCTOR",
    name: "Noxious Blast",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 4 {blight} 2t, {debuff} 1t",
    effects: [
      { kind: "blight", amount: 4, duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:p136",
    hero: "PLAGUE DOCTOR",
    name: "Incision",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 2, duration: 2 }],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
export const rangeEntries: readonly RangeEntry[] = [
  // 当前版完整FRONT p133；不向II/III级外推。
  {
    id: "hero_skill:p133",
    name: "Blinding Gas",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
export const selfEffectEntries: readonly SelfEffectEntry[] = [
  {
    id: "hero_skill:core:h07:p140",
    name: "Battlefield Medicine",
    level: 2,
    lineIndex: 0,
    kind: "heal",
    amount: 3,
  },
  {
    id: "hero_skill:core:h07:p141",
    name: "Battlefield Medicine",
    level: 3,
    lineIndex: 0,
    kind: "heal",
    amount: 4,
  },
];

/** 文本位移规则（scope + Push/Pull 原文）。 */
export const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:core:h07:p145",
    name: "Disorienting Blast",
    level: 1,
    lineIndex: 0,
    scope: "target",
    text: "Push 2 or Pull 2",
  },
  {
    id: "hero_skill:core:h07:p146",
    name: "Disorienting Blast",
    level: 2,
    lineIndex: 0,
    scope: "target",
    text: "Push 2 or Pull 2",
  },
  {
    id: "hero_skill:core:h07:p147",
    name: "Disorienting Blast",
    level: 3,
    lineIndex: 0,
    scope: "target",
    text: "Push 2 or Pull 2",
  },
];

/** Battlefield Medicine 的 Remove Bleed/Blight 行；没有标记的行与同框治疗行配对。 */
export const removalEntries: readonly RemovalEntry[] = [
  {
    id: "hero_skill:core:h07:p139",
    name: "Battlefield Medicine",
    level: 1,
    lineIndex: 0,
    scope: "target",
    kinds: ["bleed", "blight"],
  },
  {
    id: "hero_skill:core:h07:p140",
    name: "Battlefield Medicine",
    level: 2,
    lineIndex: 1,
    scope: "target",
    kinds: ["bleed", "blight"],
  },
  {
    id: "hero_skill:core:h07:p140",
    name: "Battlefield Medicine",
    level: 2,
    lineIndex: 2,
    scope: "self",
    kinds: ["bleed", "blight"],
  },
  {
    id: "hero_skill:core:h07:p141",
    name: "Battlefield Medicine",
    level: 3,
    lineIndex: 1,
    scope: "target",
    kinds: ["bleed", "blight"],
  },
  {
    id: "hero_skill:core:h07:p141",
    name: "Battlefield Medicine",
    level: 3,
    lineIndex: 2,
    scope: "self",
    kinds: ["bleed", "blight"],
  },
];
