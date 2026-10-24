/**
 * 正式网页任务目录与开局／替补共用的身份（R-081/088/094/095 + 18 英雄建队 2026-10-24）。
 * 目录成员 ≠ I 级技能效果或村庄能力已接通（R-048）。
 * 十名扩展／未核实 STAT 英雄可建队、可选印刷技能卡；属性占位或部分技能，战斗按 R-048 拒绝。
 */
export const FORMAL_HERO_NAMES = [
  "ABOMINATION",
  "ANTIQUARIAN",
  "ARBALEST",
  "BOUNTY HUNTER",
  "CRUSADER",
  "FLAGELLANT",
  "GRAVE ROBBER",
  "HELLION",
  "HIGHWAYMAN",
  "HOUNDMASTER",
  "JESTER",
  "LEPER",
  "MAN-AT-ARMS",
  "MUSKETEER",
  "OCCULTIST",
  "PLAGUE DOCTOR",
  "SHIELDBREAKER",
  "VESTAL",
] as const;

export type FormalHeroName = (typeof FORMAL_HERO_NAMES)[number];

/**
 * 战斗技能效果未完整接线或 STAT 待核实（R-048）。建队可选卡面；出征后相关命令拒绝，不发明数值。
 */
export const FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = [
  "HOUNDMASTER",
  "MUSKETEER",
  "SHIELDBREAKER",
] as const;

export function isFormalHeroName(name: string): name is FormalHeroName {
  return (FORMAL_HERO_NAMES as readonly string[]).includes(name);
}

export function heroHasUnwiredCombatSkills(name: string): boolean {
  return (FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS as readonly string[]).includes(name);
}
