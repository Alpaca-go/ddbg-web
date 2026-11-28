import type {
  DirectAttackEntry,
  HealSupportEntry,
  DirectAttackFace,
  CoreHigherSkillRow,
  StatusEffectEntry,
  RangeEntry,
  SelfEffectEntry,
  ShuffleEntry,
  RemovalEntry,
} from "./types";
import type { HeroAnnotationEntries } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 核心盒 Plague Doctor II/III 级逐卡注解（Kyries 审阅；R-048 签名断言由 core-higher-skills 执行）。 */
const coreHigherRows: readonly CoreHigherSkillRow[] = [
  {
    id: "hero_skill:core:h07:p128",
    name: "Noxious Blast",
    level: 2,
    original: ["{target_effects} 4 {blight} 3t, {debuff} 1t"],
    lines: ["{target_effects} 4 {blight} 3t, {debuff} 1t"],
    flags: {
      annotation_status_effects: [
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
    id: "hero_skill:core:h07:p129",
    name: "Noxious Blast",
    level: 3,
    original: ["{target_effects} 4 {blight} 3t, {debuff} 2t"],
    lines: ["{target_effects} 4 {blight} 3t, {debuff} 2t"],
    flags: {
      annotation_status_effects: [
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
    id: "hero_skill:core:h07:p131",
    name: "Plague Grenade",
    level: 2,
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
    },
  },
  {
    id: "hero_skill:core:h07:p132",
    name: "Plague Grenade",
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
    },
  },
  {
    id: "hero_skill:core:h07:p134",
    name: "Blinding Gas",
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
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h07:p135",
    name: "Blinding Gas",
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
      annotation_range: {
        min: 1,
        max: 2,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h07:p137",
    name: "Incision",
    level: 2,
    original: ["{target_effects} 2 {bleed} 3t"],
    lines: ["{target_effects} 2 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
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
    id: "hero_skill:core:h07:p138",
    name: "Incision",
    level: 3,
    original: ["{target_effects} 3 {bleed} 3t"],
    lines: ["{target_effects} 3 {bleed} 3t"],
    flags: {
      annotation_status_effects: [
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
    id: "hero_skill:core:h07:p143",
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
      annotation_status_effects: [
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
      annotation_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h07:p144",
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
      annotation_status_effects: [
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
      annotation_target_header: {
        lineIndex: 0,
        source: "print_front",
      },
    },
  },
  {
    id: "hero_skill:core:h07:p146",
    name: "Disorienting Blast",
    level: 2,
    original: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    lines: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 0,
          scope: "target",
          kind: "stun",
          duration: 1,
          scopeLineIndex: 0,
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
    id: "hero_skill:core:h07:p147",
    name: "Disorienting Blast",
    level: 3,
    original: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    lines: ["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"],
    flags: {
      annotation_status_effects: [
        {
          lineIndex: 1,
          segmentIndex: 0,
          scope: "target",
          kind: "stun",
          duration: 1,
          scopeLineIndex: 0,
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

/** 完整印刷逐页核对的状态效果行（docs/phases/phase2/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  // 完整FRONT p145：目标标记/可选位移在第一行，Stun续行不重复印目标标记。
  {
    id: "hero_skill:core:h07:p145",
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
    id: "hero_skill:core:h07:p142",
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
    id: "hero_skill:core:h07:p130",
    hero: "PLAGUE DOCTOR",
    name: "Plague Grenade",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {blight} 2t",
    effects: [{ kind: "blight", amount: 3, duration: 2 }],
  },
  {
    id: "hero_skill:core:h07:p133",
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
    id: "hero_skill:core:h07:p127",
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
    id: "hero_skill:core:h07:p136",
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
const rangeEntries: readonly RangeEntry[] = [
  // 当前版完整FRONT p133；不向II/III级外推。
  {
    id: "hero_skill:core:h07:p133",
    name: "Blinding Gas",
    level: 1,
    min: 1,
    max: 2,
  },
];

/** 自身治疗 / 压力行（lineIndex 指向 self_effects 行）。 */
const selfEffectEntries: readonly SelfEffectEntry[] = [
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
const shuffleEntries: readonly ShuffleEntry[] = [
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
const removalEntries: readonly RemovalEntry[] = [
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

const noxiousBlast: DirectAttackFace = {
  stances: ["support", "ranged", "defensive"],
  range: 1,
  monsterTargets: 1,
};
const plagueGrenade: DirectAttackFace = {
  stances: ["support", "ranged"],
  range: 2,
  monsterTargets: 2,
};
const sameAreaMelee: DirectAttackFace = {
  stances: ["ranged", "defensive", "aggressive"],
  range: 0,
  monsterTargets: 1,
};

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:core:h07:p127",
    name: "Noxious Blast",
    ...noxiousBlast,
    hit: { threshold: 9, damage: 2 },
    critical: { threshold: 1, damage: 4 },
  },
  {
    id: "hero_skill:core:h07:p128",
    name: "Noxious Blast",
    ...noxiousBlast,
    hit: { threshold: 10, damage: 3 },
    critical: { threshold: 1, damage: 6 },
  },
  {
    id: "hero_skill:core:h07:p129",
    name: "Noxious Blast",
    ...noxiousBlast,
    hit: { threshold: 12, damage: 4 },
    critical: { threshold: 1, damage: 7 },
  },
  {
    id: "hero_skill:core:h07:p130",
    name: "Plague Grenade",
    ...plagueGrenade,
    hit: { threshold: 9, damage: 1 },
    critical: { threshold: 0, damage: 2 },
  },
  {
    id: "hero_skill:core:h07:p131",
    name: "Plague Grenade",
    ...plagueGrenade,
    hit: { threshold: 9, damage: 2 },
    critical: { threshold: 0, damage: 4 },
  },
  {
    id: "hero_skill:core:h07:p132",
    name: "Plague Grenade",
    ...plagueGrenade,
    hit: { threshold: 12, damage: 3 },
    critical: { threshold: 1, damage: 5 },
  },
  {
    id: "hero_skill:core:h07:p136",
    name: "Incision",
    ...sameAreaMelee,
    hit: { threshold: 9, damage: 5 },
    critical: { threshold: 1, damage: 8 },
  },
  {
    id: "hero_skill:core:h07:p137",
    name: "Incision",
    ...sameAreaMelee,
    hit: { threshold: 10, damage: 7 },
    critical: { threshold: 1, damage: 11 },
  },
  {
    id: "hero_skill:core:h07:p138",
    name: "Incision",
    ...sameAreaMelee,
    hit: { threshold: 11, damage: 8 },
    critical: { threshold: 1, damage: 14 },
  },
];

const healSupportEntries: readonly HealSupportEntry[] = [
  {
    id: "hero_skill:core:h07:p139",
    name: "Battlefield Medicine",
    stances: ["support", "ranged"],
    range: 0,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 20, heal: 1 },
    critical: { threshold: 1, heal: 2 },
  },
  {
    id: "hero_skill:core:h07:p140",
    name: "Battlefield Medicine",
    stances: ["support", "ranged"],
    range: 1,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 20, heal: 2 },
    critical: { threshold: 1, heal: 4 },
  },
  {
    id: "hero_skill:core:h07:p141",
    name: "Battlefield Medicine",
    stances: ["support", "ranged"],
    range: 1,
    heroTargets: 1,
    effect: "heal",
    hit: { threshold: 20, heal: 3 },
    critical: { threshold: 1, heal: 5 },
  },
];

const entries: HeroAnnotationEntries = {
  healSupport: healSupportEntries,
  directAttack: directAttackEntries,
  higher: coreHigherRows,
  status: statusEntries,
  range: rangeEntries,
  self: selfEffectEntries,
  shuffle: shuffleEntries,
  removal: removalEntries,
  targetCount: [
    { id: "hero_skill:core:h07:p133", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p134", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p135", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p139", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p140", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p141", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p145", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p146", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:core:h07:p147", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:core:h07:p139", effect: "heal" },
    { id: "hero_skill:core:h07:p140", effect: "heal" },
    { id: "hero_skill:core:h07:p141", effect: "heal" },
  ],
};

export const h07 = defineHeroModule({
  id: "h07",
  hero: "PLAGUE DOCTOR",
  entries,
  fixes: null,
});
