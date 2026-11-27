import type { HeroSkillTrinketId } from "../heroes/hero-skill-trinkets";
import type { NormalizedTrinketCard } from "../../shared/schema";
import { FORTUNATE_ARMLET_RULE } from "./trinket-rules";

type TrinketStance = "support" | "ranged" | "defensive" | "aggressive";

/** 核心盒饰品卡 p001/002/006/007/009/013/014/021/025/026/031–034，规则书 R26。 */
type Definition = {
  name: string;
  level: 1 | 2 | 3;
  crit: number;
  accuracy: number;
  penalty: number;
  stance?: TrinketStance;
  invertedNotInStance?: TrinketStance;
  light?: "dark" | "solar";
  freeInverted?: true;
  damage?: number;
  woundOnDamage?: number;
};
export const ATTACK_TRINKET_RULES: Record<HeroSkillTrinketId, Definition> = {
  "trinket:p007": {
    name: "Damage Stone",
    level: 1,
    crit: 0,
    accuracy: 0,
    penalty: 0,
    damage: 3,
    woundOnDamage: 2,
  },
  "trinket:p025": {
    name: FORTUNATE_ARMLET_RULE.name,
    level: FORTUNATE_ARMLET_RULE.level,
    crit: FORTUNATE_ARMLET_RULE.crit,
    accuracy: FORTUNATE_ARMLET_RULE.accuracy,
    penalty: 0,
    freeInverted: true,
  },
  "trinket:p006": {
    name: "Critical Stone",
    level: 1,
    crit: 2,
    accuracy: 0,
    penalty: -2,
  },
  "trinket:p001": {
    name: "Accuracy Stone",
    level: 1,
    crit: 0,
    accuracy: 1,
    penalty: -1,
  },
  "trinket:p002": {
    name: "Archer’s Ring",
    level: 1,
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "ranged",
  },
  "trinket:p009": {
    name: "Sage’s Book",
    level: 1,
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "support",
  },
  "trinket:p014": {
    name: "Warrior’s Cap",
    level: 1,
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "defensive",
  },
  "trinket:p013": {
    name: "Warrior’s Bracer",
    level: 1,
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "aggressive",
  },
  "trinket:p031": {
    name: "Sniper’s Ring",
    level: 3,
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "ranged",
    invertedNotInStance: "ranged",
  },
  "trinket:p032": {
    name: "Warrior’s Ring",
    level: 3,
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "aggressive",
    invertedNotInStance: "aggressive",
  },
  "trinket:p033": {
    name: "Defender’s Ring",
    level: 3,
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "defensive",
    invertedNotInStance: "defensive",
  },
  "trinket:p034": {
    name: "Scholar’s Ring",
    level: 3,
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "support",
    invertedNotInStance: "support",
  },
  "trinket:p021": {
    name: "Dark Bracer",
    level: 2,
    crit: 2,
    accuracy: 0,
    penalty: 0,
    light: "dark",
  },
  "trinket:p026": {
    name: "Solar Bracer",
    level: 2,
    crit: 2,
    accuracy: 0,
    penalty: 0,
    light: "solar",
  },
};

export function readAttackTrinketRule(
  card: NormalizedTrinketCard | undefined,
  id: HeroSkillTrinketId,
) {
  const rule = ATTACK_TRINKET_RULES[id];
  if (
    !card ||
    card.id !== id ||
    !rule ||
    card.name !== rule.name ||
    card.level !== rule.level ||
    card.verification.unverified ||
    (id === FORTUNATE_ARMLET_RULE.id && card.rules?.useStress !== FORTUNATE_ARMLET_RULE.useStress)
  )
    return null;
  return rule;
}
