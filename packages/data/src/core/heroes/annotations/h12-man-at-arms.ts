import type { DirectAttackEntry } from "./types";
import { printIcon } from "../../../shared/print-icons";
import type { HeroAnnotationEntries, ShuffleEntry, SkillCorrection } from "./types";
import { defineHeroModule } from "./patch-helpers";

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:cove:h12:p235",
    name: "Rampart",
    level: 1,
    lineIndex: 0,
    scope: "target",
    text: "Push 1",
  },
  {
    id: "hero_skill:cove:h12:p235",
    name: "Rampart",
    level: 1,
    lineIndex: 1,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:cove:h12:p236",
    name: "Rampart",
    level: 2,
    lineIndex: 0,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:cove:h12:p236",
    name: "Rampart",
    level: 2,
    lineIndex: 1,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:cove:h12:p237",
    name: "Rampart",
    level: 3,
    lineIndex: 0,
    scope: "target",
    text: "Push 2",
  },
  {
    id: "hero_skill:cove:h12:p237",
    name: "Rampart",
    level: 3,
    lineIndex: 1,
    scope: "self",
    text: "Pull 1",
  },
];

/**
 * R-200：Man-at-Arms L1–III 技能族（TDH p232–252）逐卡覆盖；II/III 共 14 张 + 同族 L1 OCR 洗净。
 * Retribution / Defender 见 Q-176 / Q-177（Mark+Riposte、Guard+Protection）。
 */
const fixes: readonly SkillCorrection[] = [
  {
    id: "hero_skill:cove:h12:p235",
    name: "Rampart",
    page: 235,
    level: 1,
    expectedEffects: [
      "{target_effects}{stun}1t,{shuffle}Push1",
      "{self_effects}{buff}Self{buff}Pull1",
    ],
    expectedStats: "{range}1{target_monster}Crit1{damage}7Acc9{damage}4",
    effects: [
      [{ icon: "target_effects" }, " ", { icon: "stun" }, " 1t, ", { icon: "shuffle" }, " Push 1"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("buff", 86), relabelAs: "shuffle" },
        " Pull 1",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p236",
    name: "Rampart",
    page: 236,
    level: 2,
    expectedEffects: [
      "{target_effects}{stun}1t,{shuffle}Push2",
      "{self_effects}{buff}Self{buff}Pull1",
    ],
    expectedStats: "{range}1{target_monster}Crit1{damage}9Acc10{damage}5",
    effects: [
      [{ icon: "target_effects" }, " ", { icon: "stun" }, " 1t, ", { icon: "shuffle" }, " Push 2"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("buff", 86), relabelAs: "shuffle" },
        " Pull 1",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p237",
    name: "Rampart",
    page: 237,
    level: 3,
    expectedEffects: [
      "{target_effects}{stun}1t,{shuffle}Push2",
      "{self_effects}{buff}Self{buff}Pull1",
    ],
    expectedStats: "{range}1{target_monster}Crit1{damage}10Acc11{damage}6",
    effects: [
      [{ icon: "target_effects" }, " ", { icon: "stun" }, " 1t, ", { icon: "shuffle" }, " Push 2"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("buff", 86), relabelAs: "shuffle" },
        " Pull 1",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p238",
    name: "Bellow",
    page: 238,
    level: 1,
    expectedEffects: ["{target_effects}{debuff}1t"],
    expectedStats: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0Acc9",
    stats: [
      { line: "stats", segment: 0, expectKey: "range" },
      " 1 ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " Crit 0 Acc 9",
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: 1 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p239",
    name: "Bellow",
    page: 239,
    level: 2,
    expectedEffects: ["{target_effects}{debuff}2t"],
    expectedStats: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0Acc10",
    stats: [
      { line: "stats", segment: 0, expectKey: "range" },
      " 1 ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " Crit 0 Acc 10",
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: 2 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p240",
    name: "Bellow",
    page: 240,
    level: 3,
    expectedEffects: ["{target_effects}{debuff}3t"],
    expectedStats: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit1Acc11",
    stats: [
      { line: "stats", segment: 0, expectKey: "range" },
      " 1 ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " ",
      { sourceIcon: "target_monster" },
      " Crit 1 Acc 11",
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: 3 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p241",
    name: "Defender",
    page: 241,
    level: 1,
    expectedEffects: ["{range}{buff}Self", "{self_effects}{buff}Self{riposte}1t,{shuffle}2t"],
    expectedStats: null,
    requireIcons: [{ sourceIcon: "protection" }],
    effects: [
      [{ icon: "range" }, " Self"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("riposte", 293), relabelAs: "guard" },
        " 1t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("shuffle", 229), relabelAs: "protection" },
        " 2t",
      ],
    ],
    numbers: { prepend: [{ text: "0", numeric: 0, left: { icon: "range" } }] },
    annotations: {
      annotation_self_range: true,
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "guard", duration: 1 },
        { lineIndex: 2, segmentIndex: 2, scope: "self", kind: "protection", duration: 2 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p242",
    name: "Defender",
    page: 242,
    level: 2,
    expectedEffects: ["{range}{buff}Self", "{self_effects}{buff}Self{riposte}2t,{shuffle}2t"],
    expectedStats: null,
    requireIcons: [{ sourceIcon: "protection" }],
    effects: [
      [{ icon: "range" }, " Self"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("riposte", 293), relabelAs: "guard" },
        " 2t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("shuffle", 229), relabelAs: "protection" },
        " 2t",
      ],
    ],
    numbers: { prepend: [{ text: "0", numeric: 0, left: { icon: "range" } }] },
    annotations: {
      annotation_self_range: true,
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "guard", duration: 2 },
        { lineIndex: 2, segmentIndex: 2, scope: "self", kind: "protection", duration: 2 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p243",
    name: "Defender",
    page: 243,
    level: 3,
    expectedEffects: ["{range}{buff}Self", "{self_effects}{buff}Self{riposte}2t,{shuffle}3t"],
    expectedStats: null,
    requireIcons: [{ sourceIcon: "protection" }],
    effects: [
      [{ icon: "range" }, " Self"],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("riposte", 293), relabelAs: "guard" },
        " 2t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("shuffle", 229), relabelAs: "protection" },
        " 3t",
      ],
    ],
    numbers: { prepend: [{ text: "0", numeric: 0, left: { icon: "range" } }] },
    annotations: {
      annotation_self_range: true,
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "guard", duration: 2 },
        { lineIndex: 2, segmentIndex: 2, scope: "self", kind: "protection", duration: 3 },
      ],
    },
  },
  {
    id: "hero_skill:cove:h12:p244",
    name: "Retribution",
    page: 244,
    level: 1,
    expectedEffects: ["{self_effects}{buff}Self{stress}2t,{mark}2t"],
    expectedStats: "{range}1-2{target_monster}Crit1{damage}5Acc8{damage}3",
    effects: [
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("stress", 29), relabelAs: "mark" },
        " 2t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("mark", 451), relabelAs: "riposte" },
        " 2t",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "self", kind: "mark", duration: 2 },
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "riposte", duration: 2 },
      ],
      annotation_range: { min: 1, max: 2, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p245",
    name: "Retribution",
    page: 245,
    level: 2,
    expectedEffects: ["{self_effects}{buff}Self{stress}2t,{mark}3t"],
    expectedStats: "{range}1-2{target_monster}Crit2{damage}7Acc9{damage}4",
    effects: [
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("stress", 29), relabelAs: "mark" },
        " 2t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("mark", 451), relabelAs: "riposte" },
        " 3t",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "self", kind: "mark", duration: 2 },
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "riposte", duration: 3 },
      ],
      annotation_range: { min: 1, max: 2, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p246",
    name: "Retribution",
    page: 246,
    level: 3,
    expectedEffects: ["{self_effects}{buff}Self{stress}2t,{mark}3t"],
    expectedStats: "{range}1-2{target_monster}Crit2{damage}9Acc10{damage}5",
    effects: [
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("stress", 29), relabelAs: "mark" },
        " 2t",
      ],
      [
        { icon: "self_effects" },
        " Self ",
        { iconId: printIcon("mark", 451), relabelAs: "riposte" },
        " 3t",
      ],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 0, segmentIndex: 2, scope: "self", kind: "mark", duration: 2 },
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "riposte", duration: 3 },
      ],
      annotation_range: { min: 1, max: 2, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p247",
    name: "Command",
    page: 247,
    level: 1,
    expectedEffects: [
      "{range}1{target_hero}",
      "{self_effects}{buff}Self{stun}2t",
      "{target_effects}{stun}2t",
    ],
    expectedStats: null,
    effects: [
      [{ icon: "range" }, " 1 ", { icon: "target_hero" }],
      [{ icon: "self_effects" }, " Self ", { icon: "stun", relabelAs: "buff" }, " 2t"],
      [{ icon: "target_effects" }, " ", { icon: "stun", relabelAs: "buff" }, " 2t"],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "buff", duration: 2 },
        { lineIndex: 2, segmentIndex: 2, scope: "target", kind: "buff", duration: 2 },
      ],
      annotation_target_header: { lineIndex: 0, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p248",
    name: "Command",
    page: 248,
    level: 2,
    expectedEffects: [
      "{range}1{target_hero}{target_hero}",
      "{self_effects}{buff}Self{stun}2t",
      "{target_effects}{stun}2t",
    ],
    expectedStats: null,
    effects: [
      [{ icon: "range" }, " 1 ", { icon: "target_hero" }, " ", { icon: "target_hero" }],
      [{ icon: "self_effects" }, " Self ", { icon: "stun", relabelAs: "buff" }, " 2t"],
      [{ icon: "target_effects" }, " ", { icon: "stun", relabelAs: "buff" }, " 2t"],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "buff", duration: 2 },
        { lineIndex: 2, segmentIndex: 2, scope: "target", kind: "buff", duration: 2 },
      ],
      annotation_target_header: { lineIndex: 0, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p249",
    name: "Command",
    page: 249,
    level: 3,
    expectedEffects: [
      "{range}1{target_hero}{target_hero}{target_hero}",
      "{self_effects}{buff}Self{stun}3t",
      "{target_effects}{stun}3t",
    ],
    expectedStats: null,
    effects: [
      [
        { icon: "range" },
        " 1 ",
        { icon: "target_hero" },
        " ",
        { icon: "target_hero" },
        " ",
        { icon: "target_hero" },
      ],
      [{ icon: "self_effects" }, " Self ", { icon: "stun", relabelAs: "buff" }, " 3t"],
      [{ icon: "target_effects" }, " ", { icon: "stun", relabelAs: "buff" }, " 3t"],
    ],
    annotations: {
      annotation_status_effects: [
        { lineIndex: 1, segmentIndex: 2, scope: "self", kind: "buff", duration: 3 },
        { lineIndex: 2, segmentIndex: 2, scope: "target", kind: "buff", duration: 3 },
      ],
      annotation_target_header: { lineIndex: 0, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p250",
    name: "Bolster",
    page: 250,
    level: 1,
    expectedEffects: ["{self_effects}{buff}Self{skill_art}-1", "{shuffle}{skill_art}-1"],
    expectedStats: "Crit1Acc12",
    effects: [
      [{ icon: "self_effects" }, " Self ", { sourceIcon: "stress" }, " -1"],
      [
        { sourceIcon: "target_effects" },
        " ",
        { iconId: printIcon("shuffle", 54), relabelAs: "stress" },
        " -1",
      ],
    ],
    numbers: {
      append: [
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
      ],
    },
    annotations: {
      annotation_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
      annotation_target_stress: { lineIndex: 1, amount: -1, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p251",
    name: "Bolster",
    page: 251,
    level: 2,
    expectedEffects: ["{self_effects}{buff}Self{skill_art}-1", "{shuffle}{skill_art}-1"],
    expectedStats: "Crit1Acc14",
    effects: [
      [{ icon: "self_effects" }, " Self ", { sourceIcon: "stress" }, " -1"],
      [
        { sourceIcon: "target_effects" },
        " ",
        { iconId: printIcon("shuffle", 54), relabelAs: "stress" },
        " -1",
      ],
    ],
    numbers: {
      append: [
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
      ],
    },
    annotations: {
      annotation_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
      annotation_target_stress: { lineIndex: 1, amount: -1, source: "print_front" },
    },
  },
  {
    id: "hero_skill:cove:h12:p252",
    name: "Bolster",
    page: 252,
    level: 3,
    expectedEffects: ["{self_effects}{buff}Self{skill_art}-1", "{shuffle}{skill_art}-1"],
    expectedStats: "{range}1{target_hero}{target_hero}{target_hero}Crit2Acc16",
    effects: [
      [{ icon: "self_effects" }, " Self ", { sourceIcon: "stress" }, " -1"],
      [
        { sourceIcon: "target_effects" },
        " ",
        { iconId: printIcon("shuffle", 54), relabelAs: "stress" },
        " -1",
      ],
    ],
    numbers: {
      append: [
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
        { text: "-1", numeric: -1, left: { sourceIcon: "stress" } },
      ],
    },
    annotations: {
      annotation_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
      annotation_target_stress: { lineIndex: 1, amount: -1, source: "print_front" },
    },
  },
];

const directAttackEntries: readonly DirectAttackEntry[] = [
  {
    id: "hero_skill:cove:h12:p235",
    name: "Rampart",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 4 },
    critical: { threshold: 1, damage: 7 },
  },
  {
    id: "hero_skill:cove:h12:p236",
    name: "Rampart",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 5 },
    critical: { threshold: 1, damage: 9 },
  },
  {
    id: "hero_skill:cove:h12:p237",
    name: "Rampart",
    stances: ["ranged", "defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 11, damage: 6 },
    critical: { threshold: 1, damage: 10 },
  },
  {
    id: "hero_skill:cove:h12:p244",
    name: "Retribution",
    stances: ["ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 1,
    hit: { threshold: 8, damage: 3 },
    critical: { threshold: 1, damage: 5 },
  },
  {
    id: "hero_skill:cove:h12:p245",
    name: "Retribution",
    stances: ["ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 4 },
    critical: { threshold: 2, damage: 7 },
  },
  {
    id: "hero_skill:cove:h12:p246",
    name: "Retribution",
    stances: ["ranged", "defensive", "aggressive"],
    range: 2,
    rangeMinimum: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 5 },
    critical: { threshold: 2, damage: 9 },
  },
  {
    id: "hero_skill:cove:h12:p232",
    name: "Crush",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 8, damage: 7 },
    critical: { threshold: 1, damage: 10 },
  },
  {
    id: "hero_skill:cove:h12:p233",
    name: "Crush",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 9, damage: 9 },
    critical: { threshold: 1, damage: 14 },
  },
  {
    id: "hero_skill:cove:h12:p234",
    name: "Crush",
    stances: ["defensive", "aggressive"],
    range: 1,
    monsterTargets: 1,
    hit: { threshold: 10, damage: 11 },
    critical: { threshold: 1, damage: 16 },
  },
];

const entries: HeroAnnotationEntries = {
  directAttack: directAttackEntries,
  shuffle: shuffleEntries,
  targetCount: [
    { id: "hero_skill:cove:h12:p238", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p239", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p240", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p241", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p242", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p243", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p250", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p251", hero: 2, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h12:p252", hero: 3, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [],
};

export const h12 = defineHeroModule({
  id: "h12",
  hero: "MAN-AT-ARMS",
  entries,
  fixes,
});
