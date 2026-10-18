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
 * 仍标「未接线」的正式目录成员（R-095 / R-096 边界）。
 * OCCULTIST I 级七战斗技能与 Dark Ritual I–III 已接（III Buff 图标 R-097 LIMITED）。
 * GRAVE ROBBER 已接 I 级七战斗技能与 Pilfer 抽取（R-096）；翻面结算边见 Q-99。
 * 名单现为空；未接线效果仍按 R-048 拒绝，不发明。
 */
export const FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = [] as const;

export function isFormalHeroName(name: string): name is FormalHeroName {
  return (FORMAL_HERO_NAMES as readonly string[]).includes(name);
}

export function heroHasUnwiredCombatSkills(name: string): boolean {
  return (FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS as readonly string[]).includes(name);
}
