/**
 * 正式网页任务目录与开局／替补共用的已核实身份（R-081/088/094/095）。
 * 目录成员 ≠ I 级技能效果或村庄能力已接通（R-048）。
 * Jester / Arbalest / Abomination 无 attributesVerified，不在此列。
 */
export const FORMAL_HERO_NAMES = [
  "CRUSADER",
  "HELLION",
  "HIGHWAYMAN",
  "VESTAL",
  "BOUNTY HUNTER",
  "PLAGUE DOCTOR",
  "GRAVE ROBBER",
  "OCCULTIST",
] as const;

export type FormalHeroName = (typeof FORMAL_HERO_NAMES)[number];

/**
 * I 级战斗技能效果与 Pilfer / Dark Ritual 仍未接线（R-095 边界）。
 * 可编入开局四人，但 UI 须标明；结算走 R-048 拒绝，不发明效果。
 */
export const FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = ["GRAVE ROBBER", "OCCULTIST"] as const;

export function isFormalHeroName(name: string): name is FormalHeroName {
  return (FORMAL_HERO_NAMES as readonly string[]).includes(name);
}

export function heroHasUnwiredCombatSkills(name: string): boolean {
  return (FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS as readonly string[]).includes(name);
}
