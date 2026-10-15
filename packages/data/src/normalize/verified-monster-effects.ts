import type { MonsterEffectPlan } from "../monster-effects";
import type { NormalizedMonsterMediumCard, NormalizedMonsterLargeCard } from "./schema";
import { normalizedMonsterMediumCardSchema, normalizedMonsterLargeCardSchema } from "./schema";

/** 已核实I/II级卡面逐技能复核，R20–21。原始行保持原样，仅加可校验的原语计划。 */
const entries: readonly {
  id: string;
  name: string;
  level?: 2;
  pages: number[];
  slot: number;
  signature: string;
  effects: MonsterEffectPlan["effects"];
}[] = [
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
