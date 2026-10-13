import { diseaseRules } from "../../data/src/disease";
import type { StatusEffect } from "./status";

/** 官方 R26–28 的具名条目；ID 对应已核对印刷页，不解释未命名卡面图标。 */
export const QUIRK_NAMES = [
  "Clotter",
  "Early Riser",
  "Fast Healer",
  "Hard Noggin",
  "Night Owl",
  "Evasive",
  "Photo Mania",
  "Quick Reflexes",
  "Resilient",
  "Stress Faster",
  "Thick Blooded",
  "Hard Skinned",
  "Warrior of Light",
  "Balanced",
  "Hoarder",
  "On Guard",
  "Skilled Gambler",
  "Anemic",
  "Nocturnal",
  "Clumsy",
  "Off Guard",
  "Infirm",
  "Shocker",
  "Mercurial",
  "Night Blindness",
  "Weak Grip",
  "Slow Reflexes",
  "Nervous",
  "Stress Eater",
  "Thin Blooded",
  "Fragile",
  "Light Sensitive",
  "Fear of the Unknown",
  "Bad Gambler",
  "Soft",
] as const;
export type PassiveHolder = {
  readonly deathReason?: "madness";
  readonly diseaseId?: string | null;
  readonly quirkIds?: readonly string[];
  readonly heroLevel?: number;
  readonly level?: number;
};
export type PassiveTrigger =
  | "damageTaken"
  | "criticalDamage"
  | "moveAction"
  | "shuffled"
  | "foodConsumed"
  | "lightRaised"
  | "lightLowered"
  | "curioRolled"
  | "beforeCurio"
  | "rubbleResolved"
  | "hungerResolved"
  | "rolledTen"
  | "rolledOne";
export type PassivePlan = {
  readonly wounds: readonly number[];
  readonly stress: readonly number[];
  readonly statuses: readonly StatusEffect[];
  readonly discardFood: boolean;
  readonly heal: number;
};
export function hasQuirk(holder: PassiveHolder, name: (typeof QUIRK_NAMES)[number]): boolean {
  return (
    holder.quirkIds?.includes(`quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`) ??
    false
  );
}
export function hasDisease(holder: PassiveHolder, name: string): boolean {
  const index = diseaseRules.findIndex((entry) => entry.name === name);
  return index >= 0 && holder.diseaseId === `disease:p${String(index + 1).padStart(3, "0")}`;
}
export function passiveLevel(holder: PassiveHolder): number {
  return holder.heroLevel ?? holder.level ?? 0;
}
/** R-002：一次压力事件额外压力汇总，不递归；伤口不重新触发 Damage。 */
export function passiveStress(holder: PassiveHolder, amount: number, light: number) {
  if (amount <= 0)
    return {
      amount: amount - Number(amount < 0 && hasQuirk(holder, "Resilient")),
      wounds: [] as number[],
    };
  return {
    amount:
      amount +
      Number(light <= 2) +
      Number(hasQuirk(holder, "Nervous")) +
      Number(hasDisease(holder, "The Worries")),
    wounds: [
      ...(hasQuirk(holder, "Soft") ? [passiveLevel(holder)] : []),
      ...(hasDisease(holder, "The Worries") ? [2] : []),
    ],
  };
}
export function passiveHeal(holder: PassiveHolder, amount: number) {
  return Math.max(
    0,
    amount -
      Number(hasQuirk(holder, "Infirm")) +
      (hasQuirk(holder, "Fast Healer") ? passiveLevel(holder) : 0),
  );
}
export function passiveDamageWounds(holder: PassiveHolder): readonly number[] {
  return [
    ...(hasQuirk(holder, "Fragile") ? [1] : []),
    ...(hasDisease(holder, "Syphilis") ? [passiveLevel(holder)] : []),
  ];
}
export function passiveVirtueThreshold(holder: PassiveHolder): number {
  return 2 - Number(hasQuirk(holder, "Mercurial")) - Number(hasDisease(holder, "Ennui"));
}
/** R-069 / Q-67：同次暴击压力先合并，修正仅在调用方应用一次。 */
export function criticalStress(holder: PassiveHolder, damaged: boolean): number {
  return (
    1 +
    Number(damaged && hasQuirk(holder, "Off Guard")) +
    Number(damaged && hasQuirk(holder, "Weak Grip"))
  );
}
export function passivePlan(holder: PassiveHolder, trigger: PassiveTrigger): PassivePlan {
  const wounds: number[] = [],
    stress: number[] = [],
    statuses: StatusEffect[] = [];
  const level = passiveLevel(holder);
  let heal = 0,
    discardFood = false;
  const status = (kind: StatusEffect["kind"], duration: number, amount?: number) =>
    statuses.push({ kind, duration, ...(amount === undefined ? {} : { amount }) });
  if (trigger === "damageTaken") {
    if (hasQuirk(holder, "Clumsy")) status("debuff", 1);
    if (hasQuirk(holder, "Off Guard")) stress.push(1);
    if (hasDisease(holder, "Spotted Fever")) status("blight", 2, 1);
  }
  if (trigger === "criticalDamage") {
    if (hasQuirk(holder, "Shocker")) status("stun", 1);
    if (hasQuirk(holder, "Weak Grip")) stress.push(1);
  }
  if (trigger === "moveAction" && hasDisease(holder, "Lethargy")) wounds.push(level);
  if (trigger === "shuffled" && hasDisease(holder, "Vertigo")) stress.push(2);
  if (trigger === "foodConsumed") {
    if (hasQuirk(holder, "Stress Eater")) stress.push(1);
    if (hasQuirk(holder, "Stress Faster")) stress.push(-1);
    if (hasDisease(holder, "Bulimic")) {
      stress.push(1);
      discardFood = true;
    }
  }
  if (trigger === "lightRaised") {
    if (hasQuirk(holder, "Light Sensitive")) wounds.push(2 * level);
    if (hasQuirk(holder, "Nocturnal")) stress.push(1);
    if (hasQuirk(holder, "Early Riser")) status("buff", 2);
    if (hasQuirk(holder, "Photo Mania")) stress.push(-1);
    if (hasQuirk(holder, "Warrior of Light")) heal += 2 * level;
  }
  if (trigger === "lightLowered") {
    if (hasQuirk(holder, "Night Blindness")) stress.push(1);
    if (hasQuirk(holder, "Night Owl")) stress.push(-1);
  }
  if (trigger === "curioRolled" && hasQuirk(holder, "Hoarder")) stress.push(-1);
  if (trigger === "beforeCurio" && hasQuirk(holder, "Fear of the Unknown")) stress.push(1);
  if (trigger === "rubbleResolved" && hasDisease(holder, "Creeping Cough")) status("bleed", 4, 1);
  if (trigger === "hungerResolved" && hasDisease(holder, "Tapeworm")) status("bleed", 4, 1);
  if (trigger === "rolledTen" && hasQuirk(holder, "Bad Gambler")) wounds.push(level);
  if (trigger === "rolledOne" && hasQuirk(holder, "Skilled Gambler")) stress.push(-1);
  return { wounds, stress, statuses, heal, discardFood };
}

export function passiveDuration(holder: PassiveHolder, effect: StatusEffect): number {
  return (
    effect.duration -
    Number(
      (effect.kind === "bleed" && hasQuirk(holder, "Clotter")) ||
        (effect.kind === "blight" && hasQuirk(holder, "Thick Blooded")) ||
        (effect.kind === "stun" && hasQuirk(holder, "Hard Noggin")),
    )
  );
}
