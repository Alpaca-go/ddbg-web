/** 技能命令记录当时支持的饰品身份，后续扩充不改变旧日志的窗口。 */
export const HERO_SKILL_TRINKET_IDS = [
  "trinket:p006",
  "trinket:p001",
  "trinket:p002",
  "trinket:p009",
  "trinket:p014",
  "trinket:p031",
  "trinket:p032",
  "trinket:p033",
  "trinket:p034",
  "trinket:p021",
  "trinket:p026",
  "trinket:p013",
  "trinket:p025",
] as const;
export type HeroSkillTrinketId = (typeof HERO_SKILL_TRINKET_IDS)[number];
/** true 保留 #390 仅 Critical Stone I 的既有行为。 */
export type HeroSkillTrinketWindow = true | readonly HeroSkillTrinketId[];
