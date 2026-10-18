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
 * 仍标「未接线」的正式目录成员（R-095 / Q-98 边界）。
 * - GRAVE ROBBER：I 级七战斗技能已接；Pilfer 因 Draw 图标 `79084a2922` 仍 unverified（Q-98）未接，故保留本名单。
 * - OCCULTIST：I 级战斗技能与 Dark Ritual 均未接。
 * 可编入开局四人，但 UI 须标明缺口；未接线效果按 R-048 拒绝，不发明。
 */
export const FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = ["GRAVE ROBBER", "OCCULTIST"] as const;

export function isFormalHeroName(name: string): name is FormalHeroName {
  return (FORMAL_HERO_NAMES as readonly string[]).includes(name);
}

export function heroHasUnwiredCombatSkills(name: string): boolean {
  return (FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS as readonly string[]).includes(name);
}
