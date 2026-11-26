/** 18 名正式英雄的固定编号、归类包与全英雄页段（docs/id-naming-rules.md §4）。 */
export const HERO_ORDER = [
  "CRUSADER",
  "HELLION",
  "BOUNTY HUNTER",
  "HIGHWAYMAN",
  "VESTAL",
  "JESTER",
  "PLAGUE DOCTOR",
  "ARBALEST",
  "GRAVE ROBBER",
  "OCCULTIST",
  "ABOMINATION",
  "MAN-AT-ARMS",
  "FLAGELLANT",
  "LEPER",
  "ANTIQUARIAN",
  "SHIELDBREAKER",
  "HOUNDMASTER",
  "MUSKETEER",
] as const;

export type HeroName = (typeof HERO_ORDER)[number];

export type HeroPack = "core" | "cove" | "warrens" | "weald" | "musketeer";

export const HERO_PACK: Readonly<Record<HeroName, HeroPack>> = {
  CRUSADER: "core",
  HELLION: "core",
  "BOUNTY HUNTER": "core",
  HIGHWAYMAN: "core",
  VESTAL: "core",
  JESTER: "core",
  "PLAGUE DOCTOR": "core",
  ARBALEST: "core",
  "GRAVE ROBBER": "core",
  OCCULTIST: "core",
  ABOMINATION: "core",
  "MAN-AT-ARMS": "cove",
  FLAGELLANT: "cove",
  LEPER: "warrens",
  ANTIQUARIAN: "warrens",
  SHIELDBREAKER: "weald",
  HOUNDMASTER: "weald",
  MUSKETEER: "musketeer",
};

/** STAT 页：I / II 共用第一页的正反面，III 用下一张正面；Abomination 三张都是 front。 */
export const HERO_STAT_PAGES: Readonly<Record<HeroName, readonly [number, number, number]>> = {
  CRUSADER: [1, 1, 2],
  HELLION: [3, 3, 4],
  "BOUNTY HUNTER": [5, 5, 6],
  HIGHWAYMAN: [7, 7, 8],
  VESTAL: [9, 9, 10],
  JESTER: [11, 11, 12],
  "PLAGUE DOCTOR": [13, 13, 14],
  ARBALEST: [15, 15, 16],
  "GRAVE ROBBER": [17, 17, 18],
  OCCULTIST: [19, 19, 20],
  ABOMINATION: [21, 22, 23],
  "MAN-AT-ARMS": [24, 24, 25],
  FLAGELLANT: [26, 26, 27],
  LEPER: [28, 28, 29],
  ANTIQUARIAN: [30, 30, 31],
  SHIELDBREAKER: [32, 32, 33],
  HOUNDMASTER: [34, 34, 35],
  MUSKETEER: [36, 36, 37],
};

/** SKILL 页段起始页；每个英雄 21 张技能（7 技能 × I/II/III）。 */
export const HERO_SKILL_BASE: Readonly<Record<HeroName, number>> = {
  CRUSADER: 1,
  HELLION: 22,
  "BOUNTY HUNTER": 43,
  HIGHWAYMAN: 64,
  VESTAL: 85,
  JESTER: 106,
  "PLAGUE DOCTOR": 127,
  ARBALEST: 148,
  "GRAVE ROBBER": 169,
  OCCULTIST: 190,
  ABOMINATION: 211,
  "MAN-AT-ARMS": 232,
  FLAGELLANT: 253,
  LEPER: 274,
  ANTIQUARIAN: 295,
  SHIELDBREAKER: 316,
  HOUNDMASTER: 337,
  MUSKETEER: 358,
};

export function isHeroName(name: string): name is HeroName {
  return (HERO_ORDER as readonly string[]).includes(name);
}

export function heroNumber(name: string): string {
  const index = HERO_ORDER.indexOf(name as HeroName);
  if (index < 0) throw new Error(`未知英雄：${name}`);
  return `h${String(index + 1).padStart(2, "0")}`;
}

export function heroPack(name: string): HeroPack {
  if (!isHeroName(name)) throw new Error(`未知英雄：${name}`);
  return HERO_PACK[name];
}

export function heroStatId(name: string, level: number, face: "front" | "back"): string {
  if (!isHeroName(name)) throw new Error(`未知英雄：${name}`);
  const page = HERO_STAT_PAGES[name][level - 1];
  if (page === undefined) throw new Error(`英雄 ${name} 没有等级 ${level}`);
  if (face !== (level === 2 && name !== "ABOMINATION" ? "back" : "front"))
    throw new Error(`英雄 ${name} 的 ${level} 级 STAT 卡面不符`);
  return `hero_stat:${HERO_PACK[name]}:${heroNumber(name)}:p${String(page).padStart(3, "0")}:${face}`;
}

export function heroSkillId(name: string, page: number): string {
  if (!isHeroName(name)) throw new Error(`未知英雄：${name}`);
  const base = HERO_SKILL_BASE[name];
  if (!Number.isInteger(page) || page < base || page > base + 20)
    throw new Error(`英雄 ${name} 的 SKILL 页 ${page} 超出页段`);
  return `hero_skill:${HERO_PACK[name]}:${heroNumber(name)}:p${String(page).padStart(3, "0")}`;
}

export function heroNameForSkillPage(page: number): HeroName {
  const hero = HERO_ORDER.find((name) => {
    const base = HERO_SKILL_BASE[name];
    return page >= base && page <= base + 20;
  });
  if (!hero) throw new Error(`SKILL 页 ${page} 不在任何英雄页段`);
  return hero;
}

export function heroSkillIdForPage(page: number): string {
  return heroSkillId(heroNameForSkillPage(page), page);
}
