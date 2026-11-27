import type { HeroSkillTrinketId } from "../heroes/hero-skill-trinkets";
import type { NormalizedTrinketCard } from "../../shared/schema";

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
  useStress?: number;
  damage?: number;
  woundOnDamage?: number;
};
export const FORTUNATE_ARMLET_ID = "trinket:p025";

export const ATTACK_TRINKET_RULES = {
  "trinket:p007": {
    name: "Damage Stone",
    level: 1,
    crit: 0,
    accuracy: 0,
    penalty: 0,
    damage: 3,
    woundOnDamage: 2,
  },
  [FORTUNATE_ARMLET_ID]: {
    name: "Fortunate Armlet",
    level: 2,
    crit: 1,
    accuracy: 1,
    penalty: 0,
    useStress: 1,
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
} as const satisfies Record<HeroSkillTrinketId, Definition>;

export function readAttackTrinketRule(
  card: NormalizedTrinketCard | undefined,
  id: HeroSkillTrinketId,
) {
  const rule: Definition = ATTACK_TRINKET_RULES[id];
  if (
    !card ||
    card.id !== id ||
    !rule ||
    card.name !== rule.name ||
    card.level !== rule.level ||
    card.verification.unverified ||
    (rule.useStress !== undefined && card.rules?.useStress !== rule.useStress)
  )
    return null;
  return rule;
}
