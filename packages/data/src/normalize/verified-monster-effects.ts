import type { MonsterEffectPlan } from "../monster-effects";
import type { NormalizedMonsterMediumCard, NormalizedMonsterLargeCard } from "./schema";
import { normalizedMonsterMediumCardSchema, normalizedMonsterLargeCardSchema } from "./schema";

/** 已核实I/II级卡面逐技能复核，R20–21。原始行保持原样，仅加可校验的原语计划。 */
const entries: readonly {
  id: string;
  name: string;
  level?: 1 | 2 | 3;
  pages: number[];
  slot: number;
  signature: string;
  effects: MonsterEffectPlan["effects"];
}[] = [
  // K-002：Imperfect Reflection We Are the Same · FRONT p109–111。
  {
    id: "monster_medium:p109",
    name: "Imperfect Reflection",
    level: 3,
    pages: [109, 110, 111],
    slot: 2,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  // K-002：Imperfect Reflection It Chooses · FRONT p109（R-001 / R-048）。
  {
    id: "monster_medium:p109",
    name: "Imperfect Reflection",
    level: 3,
    pages: [109, 110, 111],
    slot: 1,
    signature: "{target_effects}{mark}2t,{stun}1t",
    effects: [
      { type: "status", scope: "target", kind: "mark", duration: 2 },
      { type: "status", scope: "target", kind: "stun", duration: 1 },
    ],
  },
  // K-001：White Cell Stalk Reconstitute · FRONT p104（R-001 / R-048）。
  {
    id: "monster_medium:p104",
    name: "White Cell Stalk",
    level: 3,
    pages: [104],
    slot: 1,
    signature: "{target_effects}{heal}14{heal},{buff}2t",
    effects: [
      { type: "heal", scope: "target", amount: 14 },
      { type: "status", scope: "target", kind: "buff", duration: 2 },
    ],
  },
  // K-001：White Cell Stalk Displace · FRONT p104（R-001 / R-048）。
  {
    id: "monster_medium:p104",
    name: "White Cell Stalk",
    level: 3,
    pages: [104],
    slot: 2,
    signature: "{target_effects}{debuff}2t,{shuffle}Push2",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "shuffle", scope: "target", direction: "push", distance: 2 },
    ],
  },
  // C-017：Fanatic I 三招；不含召唤图标。R20–21 / monster_large_FRONT p008。
  {
    id: "monster_large:p008",
    name: "Fanatic",
    pages: [8],
    slot: 1,
    signature: "{self_effects}Self{buff}3t{target_effects}{stress}+2",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 3 },
      { type: "stress", scope: "target", amount: 2 },
    ],
  },
  {
    id: "monster_large:p008",
    name: "Fanatic",
    pages: [8],
    slot: 2,
    signature: "{target_effects}{stun}1t,{shuffle}Push2,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 1 },
      { type: "shuffle", scope: "target", direction: "push", distance: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p008",
    name: "Fanatic",
    pages: [8],
    slot: 3,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_large:p003",
    name: "Ghoul",
    level: 2,
    pages: [3],
    slot: 3,
    signature: "{target_effects}{light}-1,{stress}+2,{disease}",
    effects: [
      { type: "light", scope: "target", amount: -1 },
      { type: "stress", scope: "target", amount: 2 },
      { type: "disease", scope: "target" },
    ],
  },
  {
    id: "monster_large:p003",
    name: "Ghoul",
    level: 2,
    pages: [3],
    slot: 1,
    signature: "{target_effects}3{bleed}2t,{debuff}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 3, duration: 2 },
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p003",
    name: "Ghoul",
    level: 2,
    pages: [3],
    slot: 2,
    signature: "{target_effects}{stun}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_medium:p053",
    name: "Rattler",
    level: 2,
    pages: [53, 54, 55],
    slot: 1,
    signature: "{self_effects}Self{buff}2t,{guard}1t,{riposte}1t",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "status", scope: "self", kind: "guard", duration: 1 },
      { type: "status", scope: "self", kind: "riposte", duration: 1 },
    ],
  },
  {
    id: "monster_medium:p053",
    name: "Rattler",
    level: 2,
    pages: [53, 54, 55],
    slot: 2,
    signature: "{target_effects}2{bleed}3t",
    effects: [{ type: "status", scope: "target", kind: "bleed", amount: 2, duration: 3 }],
  },
  {
    id: "monster_medium:p053",
    name: "Rattler",
    level: 2,
    pages: [53, 54, 55],
    slot: 3,
    signature: "{self_effects}Self{shuffle}Pull2",
    effects: [{ type: "shuffle", scope: "self", direction: "pull", distance: 2 }],
  },
  {
    id: "monster_medium:p050",
    name: "Gargoyle",
    level: 2,
    pages: [50, 51, 52],
    slot: 1,
    signature: "{target_effects}{debuff}2t",
    effects: [{ type: "status", scope: "target", kind: "debuff", duration: 2 }],
  },
  {
    id: "monster_medium:p050",
    name: "Gargoyle",
    level: 2,
    pages: [50, 51, 52],
    slot: 2,
    signature: "{target_effects}{stun}2t,{shuffle}Push1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "shuffle", scope: "target", direction: "push", distance: 1 },
    ],
  },
  {
    id: "monster_large:p001",
    name: "Bone Captain",
    level: 2,
    pages: [1],
    slot: 2,
    signature: "{target_effects}{stun}2t",
    effects: [{ type: "status", scope: "target", kind: "stun", duration: 2 }],
  },
  {
    id: "monster_medium:p010",
    name: "Bone Defender",
    pages: [10, 11],
    slot: 2,
    signature: "{target_effects}{stun}2t,{shuffle}Push1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "shuffle", scope: "target", direction: "push", distance: 1 },
    ],
  },
  {
    id: "monster_medium:p018",
    name: "Cultist Brawler",
    pages: [18, 19, 20],
    slot: 1,
    signature: "{self_effects}Self{shuffle}Pull1{target_effects}1{bleed}3t,{debuff}2t,{stress}+1",
    effects: [
      { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
      { type: "status", scope: "target", kind: "bleed", amount: 1, duration: 3 },
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_medium:p018",
    name: "Cultist Brawler",
    pages: [18, 19, 20],
    slot: 2,
    signature: "{self_effects}Self{shuffle}Pull1{target_effects}{damage}+1vs{mark}",
    effects: [
      { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
      { type: "damageBonus", condition: "marked", amount: 1 },
    ],
  },
  {
    id: "monster_medium:p021",
    name: "Cultist Acolyte",
    pages: [21, 22, 23],
    slot: 1,
    signature: "{target_effects}{stress}+1,{light}-1",
    effects: [
      { type: "stress", scope: "target", amount: 1 },
      { type: "light", scope: "target", amount: -1 },
    ],
  },
  {
    id: "monster_medium:p024",
    name: "Brigand Cutthroat",
    pages: [24, 25, 26],
    slot: 1,
    signature: "{target_effects}{debuff}2t",
    effects: [{ type: "status", scope: "target", kind: "debuff", duration: 2 }],
  },
  {
    id: "monster_medium:p024",
    name: "Brigand Cutthroat",
    pages: [24, 25, 26],
    slot: 3,
    signature: "{self_effects}Self{buff}2t,{shuffle}Pull1",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "shuffle", scope: "self", direction: "pull", distance: 1 },
    ],
  },
  {
    id: "monster_medium:p027",
    name: "Brigand Fusilier",
    pages: [27, 28, 29],
    slot: 1,
    signature: "{target_effects}{debuff}2t",
    effects: [{ type: "status", scope: "target", kind: "debuff", duration: 2 }],
  },
  {
    id: "monster_medium:p031",
    name: "Maggot",
    pages: [31, 32, 33],
    slot: 1,
    signature: "{target_effects}{stress}+1,{stun}1t,{disease}",
    effects: [
      { type: "stress", scope: "target", amount: 1 },
      { type: "status", scope: "target", kind: "stun", duration: 1 },
      { type: "disease", scope: "target" },
    ],
  },
  {
    id: "monster_medium:p034",
    name: "Webber",
    pages: [34, 35, 36],
    slot: 1,
    signature: "{target_effects}{debuff}2t,{stun}2t,{mark}3t",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "status", scope: "target", kind: "mark", duration: 3 },
    ],
  },
  {
    id: "monster_medium:p034",
    name: "Webber",
    pages: [34, 35, 36],
    slot: 2,
    signature: "{target_effects}1{blight}3t,{damage}+2vs{mark}",
    effects: [
      { type: "status", scope: "target", kind: "blight", amount: 1, duration: 3 },
      { type: "damageBonus", condition: "marked", amount: 2 },
    ],
  },
  {
    id: "monster_medium:p037",
    name: "Spitter",
    pages: [37, 38, 39],
    slot: 1,
    signature: "{target_effects}{debuff}2t,1{blight}3t,{damage}+2vs{mark}",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "status", scope: "target", kind: "blight", amount: 1, duration: 3 },
      { type: "damageBonus", condition: "marked", amount: 2 },
    ],
  },
  {
    id: "monster_medium:p037",
    name: "Spitter",
    pages: [37, 38, 39],
    slot: 2,
    signature: "{target_effects}1{blight}3t,{damage}+2vs{mark}",
    effects: [
      { type: "status", scope: "target", kind: "blight", amount: 1, duration: 3 },
      { type: "damageBonus", condition: "marked", amount: 2 },
    ],
  },
  {
    id: "monster_medium:p043",
    name: "Madman",
    pages: [43, 44, 45],
    slot: 1,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_medium:p043",
    name: "Madman",
    pages: [43, 44, 45],
    slot: 2,
    signature: "{target_effects}{debuff}2t,{stress}+2",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "stress", scope: "target", amount: 2 },
    ],
  },
  {
    id: "monster_medium:p046",
    name: "Pliskin",
    pages: [46, 47, 48],
    slot: 1,
    signature: "{target_effects}2{blight}2t",
    effects: [{ type: "status", scope: "target", kind: "blight", amount: 2, duration: 2 }],
  },
  {
    id: "monster_medium:p046",
    name: "Pliskin",
    pages: [46, 47, 48],
    slot: 2,
    signature: "{target_effects}2{blight}3t",
    effects: [{ type: "status", scope: "target", kind: "blight", amount: 2, duration: 3 }],
  },
  {
    id: "monster_large:p002",
    name: "Brigand Bloodletter",
    pages: [2],
    slot: 1,
    signature: "{target_effects}1{bleed}3t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 1, duration: 3 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p002",
    name: "Brigand Bloodletter",
    pages: [2],
    slot: 2,
    signature: "{target_effects}2{bleed}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 2, duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p002",
    name: "Brigand Bloodletter",
    pages: [2],
    slot: 3,
    signature: "{self_effects}Self{debuff}2t{target_effects}{shuffle}Push1",
    effects: [
      { type: "status", scope: "self", kind: "debuff", duration: 2 },
      { type: "shuffle", scope: "target", direction: "push", distance: 1 },
    ],
  },
  // Ruins II/III 与召唤物：按完整印刷卡面独立绑定。
  {
    id: "monster_large:p009",
    name: "Fanatic",
    level: 2,
    pages: [9],
    slot: 1,
    signature: "{self_effects}Self{buff}3t{target_effects}{stress}+2",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 3 },
      { type: "stress", scope: "target", amount: 2 },
    ],
  },
  {
    id: "monster_large:p009",
    name: "Fanatic",
    level: 2,
    pages: [9],
    slot: 2,
    signature: "{target_effects}{stun}1t,{shuffle}Push2,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 1 },
      { type: "shuffle", scope: "target", direction: "push", distance: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p009",
    name: "Fanatic",
    level: 2,
    pages: [9],
    slot: 3,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_large:p010",
    name: "Fanatic",
    level: 3,
    pages: [10],
    slot: 1,
    signature: "{self_effects}Self{buff}3t{target_effects}{stress}+2",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 3 },
      { type: "stress", scope: "target", amount: 2 },
    ],
  },
  {
    id: "monster_large:p010",
    name: "Fanatic",
    level: 3,
    pages: [10],
    slot: 2,
    signature: "{target_effects}{stun}1t,{shuffle}Push2,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 1 },
      { type: "shuffle", scope: "target", direction: "push", distance: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p010",
    name: "Fanatic",
    level: 3,
    pages: [10],
    slot: 3,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_large:p005",
    name: "Prophet",
    level: 1,
    pages: [5],
    slot: 1,
    signature: "{target_effects}{stun}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p005",
    name: "Prophet",
    level: 1,
    pages: [5],
    slot: 2,
    signature: "{target_effects}1{blight}3t",
    effects: [{ type: "status", scope: "target", kind: "blight", duration: 3, amount: 1 }],
  },
  {
    id: "monster_large:p006",
    name: "Prophet",
    level: 2,
    pages: [6],
    slot: 1,
    signature: "{target_effects}{stun}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p006",
    name: "Prophet",
    level: 2,
    pages: [6],
    slot: 2,
    signature: "{target_effects}2{blight}3t",
    effects: [{ type: "status", scope: "target", kind: "blight", duration: 3, amount: 2 }],
  },
  {
    id: "monster_large:p007",
    name: "Prophet",
    level: 3,
    pages: [7],
    slot: 1,
    signature: "{target_effects}{stun}2t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 2 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  {
    id: "monster_large:p007",
    name: "Prophet",
    level: 3,
    pages: [7],
    slot: 2,
    signature: "{target_effects}3{blight}3t",
    effects: [{ type: "status", scope: "target", kind: "blight", duration: 3, amount: 3 }],
  },
  {
    id: "monster_medium:p092",
    name: "The Collector",
    level: 1,
    pages: [92],
    slot: 1,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_medium:p092",
    name: "The Collector",
    level: 1,
    pages: [92],
    slot: 2,
    signature: "{self_effects}Self{heal}{heal}9{target_effects}2{bleed}2t,{mark}2t",
    effects: [
      { type: "heal", scope: "self", amount: 9 },
      { type: "status", scope: "target", kind: "bleed", duration: 2, amount: 2 },
      { type: "status", scope: "target", kind: "mark", duration: 2 },
    ],
  },
  {
    id: "monster_medium:p093",
    name: "The Collector",
    level: 2,
    pages: [93],
    slot: 1,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_medium:p093",
    name: "The Collector",
    level: 2,
    pages: [93],
    slot: 2,
    signature: "{self_effects}Self{heal}14{heal}{target_effects}2{bleed}2t,{mark}2t",
    effects: [
      { type: "heal", scope: "self", amount: 14 },
      { type: "status", scope: "target", kind: "bleed", duration: 2, amount: 2 },
      { type: "status", scope: "target", kind: "mark", duration: 2 },
    ],
  },
  {
    id: "monster_medium:p094",
    name: "The Collector",
    level: 3,
    pages: [94],
    slot: 1,
    signature: "{target_effects}{stress}+1",
    effects: [{ type: "stress", scope: "target", amount: 1 }],
  },
  {
    id: "monster_medium:p094",
    name: "The Collector",
    level: 3,
    pages: [94],
    slot: 2,
    signature: "{self_effects}Self{heal}18{heal}{target_effects}3{bleed}2t,{mark}2t",
    effects: [
      { type: "heal", scope: "self", amount: 18 },
      { type: "status", scope: "target", kind: "bleed", duration: 2, amount: 3 },
      { type: "status", scope: "target", kind: "mark", duration: 2 },
    ],
  },
  {
    id: "monster_medium:p095",
    name: "Collected Highwayman",
    level: 1,
    pages: [95],
    slot: 1,
    signature: "{target_effects}1{bleed}2t",
    effects: [{ type: "status", scope: "target", kind: "bleed", duration: 2, amount: 1 }],
  },
  {
    id: "monster_medium:p096",
    name: "Collected Highwayman",
    level: 2,
    pages: [96],
    slot: 1,
    signature: "{target_effects}2{bleed}2t",
    effects: [{ type: "status", scope: "target", kind: "bleed", duration: 2, amount: 2 }],
  },
  {
    id: "monster_medium:p097",
    name: "Collected Highwayman",
    level: 3,
    pages: [97],
    slot: 1,
    signature: "{target_effects}3{bleed}2t",
    effects: [{ type: "status", scope: "target", kind: "bleed", duration: 2, amount: 3 }],
  },
  {
    id: "monster_medium:p098",
    name: "Collected Man-at-Arms",
    level: 1,
    pages: [98],
    slot: 1,
    signature: "{target_effects}{stun}1t",
    effects: [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
  },
  {
    id: "monster_medium:p099",
    name: "Collected Man-at-Arms",
    level: 2,
    pages: [99],
    slot: 1,
    signature: "{target_effects}{stun}1t",
    effects: [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
  },
  {
    id: "monster_medium:p100",
    name: "Collected Man-at-Arms",
    level: 3,
    pages: [100],
    slot: 1,
    signature: "{target_effects}{stun}1t",
    effects: [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
  },
  {
    id: "monster_medium:p101",
    name: "Collected Vestal",
    level: 1,
    pages: [101],
    slot: 1,
    signature: "{target_effects}{buff}2t,{heal}{heal}7",
    effects: [
      { type: "status", scope: "target", kind: "buff", duration: 2 },
      { type: "heal", scope: "target", amount: 7 },
    ],
  },
  {
    id: "monster_medium:p102",
    name: "Collected Vestal",
    level: 2,
    pages: [102],
    slot: 1,
    signature: "{target_effects}{buff}2t,{heal}{heal}9",
    effects: [
      { type: "status", scope: "target", kind: "buff", duration: 2 },
      { type: "heal", scope: "target", amount: 9 },
    ],
  },
  {
    id: "monster_medium:p103",
    name: "Collected Vestal",
    level: 3,
    pages: [103],
    slot: 1,
    signature: "{target_effects}{buff}2t,{heal}11{heal}",
    effects: [
      { type: "status", scope: "target", kind: "buff", duration: 2 },
      { type: "heal", scope: "target", amount: 11 },
    ],
  },
  // A-01：`monster_large:p014` slot 2 Stinger Shot · FRONT p014（R-001 / R-048）。
  {
    id: "monster_large:p014",
    name: "Templar Warlord",
    level: 3,
    pages: [14],
    slot: 2,
    signature: "{target_effects}3{blight}3t,{debuff}2t",
    effects: [
      { type: "status", scope: "target", kind: "blight", amount: 3, duration: 3 },
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
    ],
  },
  // A-01：`monster_large:p014` slot 3 Revelation · FRONT p014（R-001 / R-048）。
  {
    id: "monster_large:p014",
    name: "Templar Warlord",
    level: 3,
    pages: [14],
    slot: 3,
    signature: "{target_effects}{stress}+2",
    effects: [{ type: "stress", scope: "target", amount: 2 }],
  },
  // A-01：`monster_large:p015` slot 2 Body Slam · FRONT p015（R-001 / R-048；Pit Toss 印刷文字仅签名，几何 hold）。
  {
    id: "monster_large:p015",
    name: "Templar Impaler",
    level: 3,
    pages: [15],
    slot: 2,
    signature: "{target_effects}{stun}2t,PitToss",
    effects: [{ type: "status", scope: "target", kind: "stun", duration: 2 }],
  },
  // A-01：`monster_large:p015` slot 3 Revelation · FRONT p015（R-001 / R-048）。
  {
    id: "monster_large:p015",
    name: "Templar Impaler",
    level: 3,
    pages: [15],
    slot: 3,
    signature: "{target_effects}{stress}+2",
    effects: [{ type: "stress", scope: "target", amount: 2 }],
  },
  // A-01：`monster_large:p016` slot 1 Bulging Gaze · FRONT p016（R-001 / R-048）。
  {
    id: "monster_large:p016",
    name: "Mammoth Cyst",
    level: 3,
    pages: [16],
    slot: 1,
    signature: "{target_effects}{debuff}1t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 1 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  // A-01：`monster_large:p016` slot 2 Digestion · FRONT p016（R-001 / R-048）。
  {
    id: "monster_large:p016",
    name: "Mammoth Cyst",
    level: 3,
    pages: [16],
    slot: 2,
    signature: "{target_effects}3{blight}2t",
    effects: [{ type: "status", scope: "target", kind: "blight", amount: 3, duration: 2 }],
  },
  // A-01 / A-06：`monster_large:p016` slot 3 Revivify · FRONT p016（R-001 / R-048）。
  {
    id: "monster_large:p016",
    name: "Mammoth Cyst",
    level: 3,
    pages: [16],
    slot: 3,
    signature: "{self_effects}Self{buff}2t,{damage_or_heal_combined_marker}15{heal}",
    effects: [
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "heal", scope: "self", amount: 15 },
    ],
  },
  // A-01：`monster_large:p017` slot 1 Lacerate · FRONT p017（R-001 / R-048）。
  {
    id: "monster_large:p017",
    name: "Shuffling Horror",
    level: 3,
    pages: [17],
    slot: 1,
    signature: "{target_effects}3{bleed}3t",
    effects: [{ type: "status", scope: "target", kind: "bleed", amount: 3, duration: 3 }],
  },
  // A-01：`monster_large:p017` slot 3 Echoing Disassembly · FRONT p017（R-001 / R-048）。
  {
    id: "monster_large:p017",
    name: "Shuffling Horror",
    level: 3,
    pages: [17],
    slot: 3,
    signature: "{target_effects}{stress}+2,{light}-1,{summon}",
    effects: [
      { type: "stress", scope: "target", amount: 2 },
      { type: "light", scope: "target", amount: -1 },
    ],
  },
  // A-01：`monster_large:p018` slot 1 Refashion Them · FRONT p018（R-001 / R-048）。
  {
    id: "monster_large:p018",
    name: "Ancestor 2",
    level: 3,
    pages: [18],
    slot: 1,
    signature: "{target_effects}3{bleed}3t,{stress}+1,{light}-1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 3, duration: 3 },
      { type: "stress", scope: "target", amount: 1 },
      { type: "light", scope: "target", amount: -1 },
    ],
  },
  // A-01：`monster_large:p018` slot 2 Unmake Them All · FRONT p018（R-001 / R-048）。
  {
    id: "monster_large:p018",
    name: "Ancestor 2",
    level: 3,
    pages: [18],
    slot: 2,
    signature: "{target_effects}2{bleed}4t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 2, duration: 4 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  // A-01：`monster_large:p018` slot 3 Embrace Futility · FRONT p018（R-001 / R-048）。
  {
    id: "monster_large:p018",
    name: "Ancestor 2",
    level: 3,
    pages: [18],
    slot: 3,
    signature: "{target_effects}{debuff}2t,{stress}+2,{shuffle}Push2",
    effects: [
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
      { type: "stress", scope: "target", amount: 2 },
      { type: "shuffle", scope: "target", direction: "push", distance: 2 },
    ],
  },
  // A-01：`monster_large:p020` slot 1 Know This · FRONT p020（R-001 / R-048）。
  {
    id: "monster_large:p020",
    name: "Heart of Darkness",
    level: 3,
    pages: [20],
    slot: 1,
    signature: "{target_effects}{stress}+3,{light}-1",
    effects: [
      { type: "stress", scope: "target", amount: 3 },
      { type: "light", scope: "target", amount: -1 },
    ],
  },
  // A-01：`monster_large:p020` slot 2 Puncture · FRONT p020（R-001 / R-048）。
  {
    id: "monster_large:p020",
    name: "Heart of Darkness",
    level: 3,
    pages: [20],
    slot: 2,
    signature: "{target_effects}3{bleed}3t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "bleed", amount: 3, duration: 3 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
  // A-01：`monster_large:p020` slot 3 Dissolution · FRONT p020（R-001 / R-048）。
  {
    id: "monster_large:p020",
    name: "Heart of Darkness",
    level: 3,
    pages: [20],
    slot: 3,
    signature: "{target_effects}{stun}1t,3{blight}3t,{stress}+1",
    effects: [
      { type: "status", scope: "target", kind: "stun", duration: 1 },
      { type: "status", scope: "target", kind: "blight", amount: 3, duration: 3 },
      { type: "stress", scope: "target", amount: 1 },
    ],
  },
];

export function attachVerifiedMonsterEffects(
  cards: readonly NormalizedMonsterMediumCard[],
): NormalizedMonsterMediumCard[];
export function attachVerifiedMonsterEffects(
  cards: readonly NormalizedMonsterLargeCard[],
  large: true,
): NormalizedMonsterLargeCard[];
export function attachVerifiedMonsterEffects(
  cards: readonly NormalizedMonsterMediumCard[],
  large = false,
) {
  const applicable = entries.filter((e) =>
    e.id.startsWith(large ? "monster_large:" : "monster_medium:"),
  );
  for (const entry of applicable) {
    const card = cards.find((c) => c.id === entry.id);
    if (
      !card ||
      cards.filter((c) => c.id === entry.id).length !== 1 ||
      !("skills" in card) ||
      card.name !== entry.name ||
      card.level !== (entry.level ?? 1) ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages)
    )
      throw new Error(`怪物效果身份不符：${entry.id}`);
    const skill = card.skills.find((s) => s.slot === entry.slot);
    if (
      !skill ||
      card.skills.filter((s) => s.slot === entry.slot).length !== 1 ||
      skill.effect_lines.length !== 1 ||
      skill.effect_lines[0]!.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error(`怪物效果行未核实：${entry.id}/${entry.slot}`);
    const signature = skill.effect_lines[0]!.map((s) =>
      s.type === "text" ? s.text : `{${s.icon.key}}`,
    )
      .join("")
      .replace(/\s+/g, "");
    if (signature !== entry.signature) throw new Error(`怪物效果行漂移：${entry.id}/${entry.slot}`);
  }
  return cards.map((card) => {
    if (!("skills" in card)) return card;
    const next = {
      ...card,
      skills: card.skills.map((skill) => {
        const entry = applicable.find((e) => e.id === card.id && e.slot === skill.slot);
        return entry
          ? {
              ...skill,
              verified_monster_effects: {
                source: "print_front" as const,
                signatures: [entry.signature],
                effects: entry.effects,
              },
            }
          : skill;
      }),
    };
    return large
      ? normalizedMonsterLargeCardSchema.parse(next)
      : normalizedMonsterMediumCardSchema.parse(next);
  });
}
