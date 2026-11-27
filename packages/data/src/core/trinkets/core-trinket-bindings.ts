import { printIcon } from "../../shared/print-icons";
import type { NormalizedTrinketCard } from "../../shared/schema";

// R-127：完整印刷双面绑定；verification通过不等于无需逐项解释图标。
export const CORE_TRINKET_BINDINGS = {
  "trinket:p001": {
    name: "Accuracy Stone",
    level: 1,
    faces: ['[["Acc+1"]]', '[["Acc-1"]]'],
  },
  "trinket:p002": {
    name: "Archer’s Ring",
    level: 1,
    faces: [
      `[["Acc+2 when in ","@${printIcon("stance_ranged_lit", 735)}:stance_ranged_lit"]]`,
      '[["Acc-1"]]',
    ],
  },
  "trinket:p003": {
    name: "Bleed Charm",
    level: 1,
    faces: [
      `[["When you hit with a Skill"],["inflict an additional 2 ","@${printIcon("bleed", 213)}:bleed"," 2t"]]`,
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p004": {
    name: "Blight Charm",
    level: 1,
    faces: [
      `[["When you hit with a Skill"],["inflict an additional 2 ","@${printIcon("blight", 339)}:blight"," 2t"]]`,
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p005": {
    name: "Caution Cloak",
    level: 1,
    faces: ['[["Scout without suffering any"]]', `[["@${printIcon("light", 346)}:light"," -1"]]`],
  },
  "trinket:p006": {
    name: "Critical Stone",
    level: 1,
    faces: ['[["Crit+2"]]', '[["Acc-2"]]'],
  },
  "trinket:p007": {
    name: "Damage Stone",
    level: 1,
    faces: [
      `[["@${printIcon("damage", 341)}:damage"," +3"]]`,
      `[["When you take Damage:"],["suffer 2 ","@${printIcon("wound", 793)}:wound"]]`,
    ],
  },
  "trinket:p008": {
    name: "Debuff Charm",
    level: 1,
    faces: [
      `[["When you hit with a Skill"],["inflict an additional ","@${printIcon("debuff", 716)}:debuff"," 2t"]]`,
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p009": {
    name: "Sage’s Book",
    level: 1,
    faces: [
      `[["Acc+2 when in ","@${printIcon("stance_support_lit", 748)}:stance_support_lit"]]`,
      '[["Acc-1"]]',
    ],
  },
  "trinket:p010": {
    name: "Speed Stone",
    level: 1,
    faces: [
      `[["+ ","@${printIcon("speed", 4)}:speed"," or ","@${printIcon("dodge", 458)}:dodge"," +1"]]`,
      `[["- ","@${printIcon("speed", 397)}:speed"," or ","@${printIcon("dodge", 640)}:dodge"," -1"]]`,
    ],
  },
  "trinket:p011": {
    name: "Stun Charm",
    level: 1,
    faces: [
      `[["When you hit with a skill"],["inflict an additional ","@${printIcon("stun", 347)}:stun"," 1t"]]`,
      '[["-1t to a Condition you are causing"]]',
    ],
  },
  "trinket:p012": {
    name: "Survival Guide",
    level: 1,
    faces: [
      `[["When exploring:"],["ignore a ","@${printIcon("trap", 760)}:trap"," or ","@${printIcon("hunger", 809)}:hunger"]]`,
      `[["When exploring, turn"],["an Exploration Die that"],["is not a ","@${printIcon("trap", 661)}:trap"," , to ","@${printIcon("trap", 661)}:trap"]]`,
    ],
  },
  "trinket:p013": {
    name: "Warrior’s Bracer",
    level: 1,
    faces: ['[["Acc+2 Acc when in"]]', '[["Acc-1"]]'],
    frontStance: { iconId: printIcon("stance_aggressive_lit", 752), key: "stance_aggressive_lit" },
  },
  "trinket:p014": {
    name: "Warrior’s Cap",
    level: 1,
    faces: [
      `[["Acc+2 when in ","@${printIcon("stance_defensive_lit", 749)}:stance_defensive_lit"]]`,
      '[["Acc-1"]]',
    ],
  },
  "trinket:p015": {
    name: "Bloodthirst Ring",
    level: 2,
    faces: [
      `[["Consume one ","@${printIcon("food", 240)}:food"," and ","@${printIcon("heal", 160)}:heal"," 10 ","@${printIcon("heal", 143)}:heal"]]`,
      `[["When hit: Suffer 3 ","@${printIcon("bleed", 715)}:bleed"," 2t"]]`,
    ],
  },
  "trinket:p016": {
    name: "Book of Constitution",
    level: 2,
    faces: [
      `[["When you suffer a ","@${printIcon("disease", 839)}:disease"],["discard it immediately"]]`,
      `[["- ","@${printIcon("speed", 397)}:speed"," ","@${printIcon("speed", 397)}:speed"]]`,
    ],
  },
  "trinket:p017": {
    name: "Book of Holiness",
    level: 2,
    faces: [
      `[["@${printIcon("stress", 82)}:stress"," -3"]]`,
      '[["Turn a hit against you into a Crit."]]',
    ],
  },
  "trinket:p018": {
    name: "Book of Relaxation",
    level: 2,
    faces: [
      `[["@${printIcon("stress", 82)}:stress"," -2"]]`,
      `[["@${printIcon("dodge", 640)}:dodge"," -2"]]`,
    ],
  },
  "trinket:p019": {
    name: "Camouflage Cloak",
    level: 2,
    faces: [
      `[["@${printIcon("dodge", 458)}:dodge"," +2 if ","@${printIcon("light", 226)}:light"," is 3"],["@${printIcon("compare_gte", 775)}:compare_gte"," <"]]`,
      `[["When hit: Suffer ","@${printIcon("stun", 875)}:stun"," 1t"]]`,
    ],
  },
  "trinket:p020": {
    name: "Chirurgeon’s Charm",
    level: 2,
    faces: [
      `[["When healing: heal ","@${printIcon("heal", 288)}:heal"," +2 ","@${printIcon("heal", 143)}:heal"]]`,
      `[["When healed: recieve ","@${printIcon("heal", 842)}:heal"," -4 ","@${printIcon("heal", 873)}:heal"]]`,
    ],
  },
  "trinket:p021": {
    name: "Dark Bracer",
    level: 2,
    faces: [
      `[["Crit+2 if ","@${printIcon("light", 226)}:light"," ","@${printIcon("compare_lte", 726)}:compare_lte"," < 3"]]`,
      `[["@${printIcon("compare_gte", 855)}:compare_gte"," <"],["When a Skill Hits the Target:"],["if ","@${printIcon("light", 871)}:light"," 3 Deal no ","@${printIcon("damage", 341)}:damage"," ."]]`,
    ],
  },
  "trinket:p022": {
    name: "Protective Padlock",
    level: 2,
    faces: [
      `[["When hit: Suffer half the"],["@${printIcon("damage", 341)}:damage"," X rounded up"]]`,
      `[["- ","@${printIcon("speed", 397)}:speed"]]`,
    ],
  },
  "trinket:p023": {
    name: "Bloodcourse Medallion",
    level: 2,
    faces: [
      `[["When healed, receive ","@${printIcon("heal", 160)}:heal"," ","@${printIcon("heal", 143)}:heal"," 4"]]`,
      `[["When hit: Suffer 1 ","@${printIcon("bleed", 715)}:bleed"," 3t"]]`,
    ],
  },
  "trinket:p024": {
    name: "Camper’s Helmet",
    level: 2,
    faces: [
      `[["When Camping, roll 2 ","@${printIcon("provisions", 326)}:provisions"]]`,
      `[["@${printIcon("stress", 268)}:stress"," +1 when Scouting"]]`,
    ],
  },
  "trinket:p025": {
    name: "Fortunate Armlet",
    level: 2,
    faces: ['[["Acc+1 and Crit+1"]]', `[["@${printIcon("stress", 268)}:stress"," +1"]]`],
  },
  "trinket:p026": {
    name: "Solar Bracer",
    level: 2,
    faces: [
      `[["Crit+2 if ","@${printIcon("light", 713)}:light"," 3"],["@${printIcon("compare_lte", 746)}:compare_lte"," <"]]`,
      `[["When a Skill Hits the Target:"],["if ","@${printIcon("light", 346)}:light"," ","@${printIcon("compare_gte", 831)}:compare_gte"," < 3 Deal no ","@${printIcon("damage", 341)}:damage"," ."]]`,
    ],
  },
  "trinket:p027": {
    name: "Berserk Charm",
    level: 3,
    faces: ['[["Gain +1 Action"]]', `[["@${printIcon("stress", 268)}:stress"," +1"]]`],
  },
  "trinket:p028": {
    name: "Dark Crown",
    level: 3,
    faces: [
      `[["@${printIcon("stress", 82)}:stress"," -9 if ","@${printIcon("light", 713)}:light"," ","@${printIcon("compare_lte", 726)}:compare_lte"," < 3"]]`,
      `[["When the result is determined,"],["-2 Virtue Chance if ","@${printIcon("light", 346)}:light"," ","@${printIcon("compare_gte", 800)}:compare_gte"," < 3"]]`,
    ],
  },
  "trinket:p029": {
    name: "Fasting Seal",
    level: 3,
    faces: [
      `[["@${printIcon("dodge", 458)}:dodge"," +5"]]`,
      `[["Consume a ","@${printIcon("food", 833)}:food"," gaining no effect"]]`,
    ],
  },
  "trinket:p030": {
    name: "Recovery Charm",
    level: 3,
    faces: [
      `[["@${printIcon("heal", 160)}:heal"," ","@${printIcon("heal", 872)}:heal"," 9"]]`,
      `[["@${printIcon("stress", 268)}:stress"," +2"]]`,
    ],
  },
  "trinket:p031": {
    name: "Sniper’s Ring",
    level: 3,
    faces: [
      `[["Crit+4 if in ","@${printIcon("stance_ranged_lit", 735)}:stance_ranged_lit"]]`,
      `[["Acc-2 if not in ","@${printIcon("stance_ranged_lit", 787)}:stance_ranged_lit"]]`,
    ],
  },
  "trinket:p032": {
    name: "Warrior’s Ring",
    level: 3,
    faces: [
      `[["Crit+4 if in ","@${printIcon("stance_aggressive_lit", 752)}:stance_aggressive_lit"]]`,
      `[["Acc-2 if not in ","@${printIcon("stance_aggressive_lit", 863)}:stance_aggressive_lit"]]`,
    ],
  },
  "trinket:p033": {
    name: "Defender’s Ring",
    level: 3,
    faces: [
      `[["Crit+4 if in ","@${printIcon("stance_defensive_lit", 749)}:stance_defensive_lit"]]`,
      `[["Acc-2 if not in ","@${printIcon("stance_defensive_lit", 830)}:stance_defensive_lit"]]`,
    ],
  },
  "trinket:p034": {
    name: "Scholar’s Ring",
    level: 3,
    faces: [
      `[["Crit+4 if in ","@${printIcon("stance_support_lit", 748)}:stance_support_lit"]]`,
      `[["Acc-2 if not in ","@${printIcon("stance_support_lit", 825)}:stance_support_lit"]]`,
    ],
  },
  "trinket:p035": {
    name: "Solar Crown",
    level: 3,
    faces: [
      `[["@${printIcon("stress", 82)}:stress"," -3 if 3"],["@${printIcon("compare_lte", 746)}:compare_lte"," < ","@${printIcon("light", 796)}:light"]]`,
      `[["@${printIcon("compare_gte", 868)}:compare_gte"," < ","@${printIcon("light", 346)}:light"],["When the result is determined,"],["-2 Virtue Chance if 3"]]`,
    ],
  },
  "trinket:p036": {
    name: "Book of Sanity",
    level: 3,
    faces: [
      `[["@${printIcon("stress", 82)}:stress"," -4"]]`,
      `[["Suffer ","@${printIcon("damage", 341)}:damage"," 6"]]`,
    ],
  },
  "trinket:p037": {
    name: "Candle of Life",
    level: 3,
    faces: [
      `[["You and every Hero in"],["the same Area ","@${printIcon("heal", 288)}:heal"," ","@${printIcon("heal", 558)}:heal"," 6"]]`,
      `[["@${printIcon("light", 346)}:light"," -2"]]`,
    ],
  },
  "trinket:p038": {
    name: "Cleansing Crystal",
    level: 3,
    faces: [
      `[["Remove all ","@${printIcon("bleed", 213)}:bleed"," , ","@${printIcon("blight", 290)}:blight"," , ","@${printIcon("debuff", 716)}:debuff"," , ","@${printIcon("stun", 347)}:stun"," , ","@${printIcon("mark", 358)}:mark"],["from all Heroes"]]`,
      `[["Gain a ","@${printIcon("draw_negative_quirk", 955)}:draw_negative_quirk"]]`,
    ],
  },
} as const;
export type CoreTrinketId = keyof typeof CORE_TRINKET_BINDINGS;
export const CORE_TRINKET_IDS = Object.keys(CORE_TRINKET_BINDINGS) as CoreTrinketId[];

const confirmed = (naming: string) => naming === "confirmed" || naming === "confirmed_rulebook";

/** R-127／R-048：校验印刷面与逐卡核准内容。 */
export function matchesCoreTrinketPrint(card: NormalizedTrinketCard, id: CoreTrinketId): boolean {
  const binding = CORE_TRINKET_BINDINGS[id];
  return (
    card.id === id &&
    !card.verification.unverified &&
    card.name === binding.name &&
    card.level === binding.level &&
    [card.upright_half, card.inverted_half].every(
      (half, index) =>
        half.name === card.name &&
        half.level === card.level &&
        half.printed_rotation === (index ? 180 : 0) &&
        half.effect_lines.every((line) =>
          line.every((segment) => segment.type === "text" || confirmed(segment.icon.naming)),
        ) &&
        JSON.stringify(
          half.effect_lines.map((line) =>
            line.map((segment) =>
              segment.type === "text"
                ? segment.text
                : "@" + segment.icon.iconId + ":" + segment.icon.key,
            ),
          ),
        ) === binding.faces[index],
    )
  );
}

/** p013 的姿态图标没有进入印刷效果行，需单独核对正面图标。 */
export function matchesBracerFrontStance(card: NormalizedTrinketCard): boolean {
  const { iconId, key } = CORE_TRINKET_BINDINGS["trinket:p013"].frontStance;
  return (
    card.front_icons.filter((icon) => icon.key?.startsWith("stance_")).length === 1 &&
    card.front_icons.some(
      (icon) => icon.iconId === iconId && icon.key === key && confirmed(icon.naming),
    )
  );
}
