import type { FormalHeroName } from "./formal-heroes";
import { isFormalHeroName } from "./formal-heroes";

/** 十八名正式英雄属性均已核实（R-200；与 normalized hero_stat 一致）。 */
export const FORMAL_HEROES_VERIFIED_ATTRIBUTES: readonly FormalHeroName[] = [
  "CRUSADER",
  "HELLION",
  "HIGHWAYMAN",
  "VESTAL",
  "BOUNTY HUNTER",
  "PLAGUE DOCTOR",
  "GRAVE ROBBER",
  "OCCULTIST",
  "JESTER",
  "ARBALEST",
  "ABOMINATION",
  "ANTIQUARIAN",
  "LEPER",
  "FLAGELLANT",
  "MAN-AT-ARMS",
  "HOUNDMASTER",
  "SHIELDBREAKER",
  "MUSKETEER",
];

/** 核心盒两名：STAT 与七张 I 级战斗技能均已核实接线（R-102/R-103，2026-10-24）。 */
export const FORMAL_HEROES_PARTIAL_CORE_SKILLS: readonly FormalHeroName[] = [];

/** Abomination 双面变身卡：规范化 `hero` 为 null，出征/替补按英雄归属。 */
export const ABOMINATION_DOUBLE_FACED_SKILL_IDS: Record<1 | 2 | 3, string> = {
  1: "hero_skill:p220",
  2: "hero_skill:p221",
  3: "hero_skill:p222",
};

const EXTENSION_ROSTER_HEROES: readonly FormalHeroName[] = [];

export function isFormalHeroVerifiedAttributes(name: string): boolean {
  return (FORMAL_HEROES_VERIFIED_ATTRIBUTES as readonly string[]).includes(name);
}

export function isFormalHeroRosterPendingAttributes(name: string): boolean {
  return isFormalHeroName(name) && !isFormalHeroVerifiedAttributes(name);
}

/** 建队 I 级 STAT 面 id（与 hero-stat-print-art-map 一致；数值为占位，待 Kyries 核实）。 */
const ROSTER_PENDING_STAT_IDS: Record<FormalHeroName, string> = {
  ANTIQUARIAN: "hero_stat:warrens:antiquarian:p001:front",
  LEPER: "hero_stat:warrens:leper:p001:front",
  FLAGELLANT: "hero_stat:cove:flagellant:p001:front",
  "MAN-AT-ARMS": "hero_stat:cove:man-at-arms:p001:front",
  HOUNDMASTER: "hero_stat:weald:houndmaster:p001:front",
  SHIELDBREAKER: "hero_stat:weald:shieldbreaker:p001:front",
  MUSKETEER: "",
  CRUSADER: "",
  HELLION: "",
  HIGHWAYMAN: "",
  VESTAL: "",
  "BOUNTY HUNTER": "",
  "PLAGUE DOCTOR": "",
  "GRAVE ROBBER": "",
  OCCULTIST: "",
  JESTER: "",
  ARBALEST: "",
  ABOMINATION: "",
};

/** 与 tools/pipeline/print-card-art/fixtures/print-hero-18-art-catalog.mjs EXTENSION_SKILL_BLOCKS 对齐。 */
/** Antiquarian / Leper：规范化 `hero_skill:p274`–`p315`（TDH 印刷页，见 Q-103）。 */
export const WARRENS_VERIFIED_SKILL_PAGE_BLOCKS = [
  { hero: "LEPER" as const, startPage: 274, count: 21 },
  { hero: "ANTIQUARIAN" as const, startPage: 295, count: 21 },
] as const;

/** Man-at-Arms / Flagellant：规范化 `hero_skill:p232`–`p273`（TDH 印刷页，见 Q-105）。 */
export const COVE_VERIFIED_SKILL_PAGE_BLOCKS = [
  { hero: "MAN-AT-ARMS" as const, startPage: 232, count: 21 },
  { hero: "FLAGELLANT" as const, startPage: 253, count: 21 },
] as const;

/** Shieldbreaker / Houndmaster：规范化 `hero_skill:p316`–`p357`（TDH 印刷页，见 Q-106）。 */
export const WEALD_VERIFIED_SKILL_PAGE_BLOCKS = [
  { hero: "SHIELDBREAKER" as const, startPage: 316, count: 21 },
  { hero: "HOUNDMASTER" as const, startPage: 337, count: 21 },
] as const;

/** Musketeer：规范化 `hero_skill:musketeer:p001`–`p021`（MG_DD_08 包 p1–21，见 Q-107）。 */
export const MUSKETEER_VERIFIED_SKILL_PAGE_BLOCKS = [
  { hero: "MUSKETEER" as const, startPage: 1, count: 21 },
] as const;

export type FormalRosterHeroStat = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly life: number;
  readonly dodge: number;
  readonly speed: number;
  readonly attributesVerified: false;
  readonly rosterPendingConfirmation: true;
};

export function formalRosterPendingHeroStats(): readonly FormalRosterHeroStat[] {
  const pending = [...EXTENSION_ROSTER_HEROES] as FormalHeroName[];
  return pending.map((name) => {
    const id = ROSTER_PENDING_STAT_IDS[name];
    if (!id) throw new Error(`缺少建队占位 STAT id：${name}`);
    return {
      id,
      name,
      level: 1,
      life: 1,
      dodge: 0,
      speed: 0,
      attributesVerified: false,
      rosterPendingConfirmation: true,
    };
  });
}

/** R-200：扩展英雄 II/III 已核实，不再注入建队 art-only 占位技能。 */
export function formalRosterArtOnlySkills(): readonly never[] {
  return [];
}

export function formalRosterLevel1ArtSkillIds(hero: FormalHeroName): readonly string[] {
  void hero;
  return [];
}

export function isFormalRosterArtSkill(skill: {
  readonly rosterArtOnly?: boolean;
  readonly verification?: { readonly unverified?: boolean };
}): boolean {
  return skill.rosterArtOnly === true;
}

export function skillBelongsToFormalHero(
  heroName: string,
  skill: { readonly hero: string | null; readonly level: number; readonly id: string },
): boolean {
  if (skill.hero === heroName) return true;
  return (
    heroName === "ABOMINATION" &&
    skill.level >= 1 &&
    skill.level <= 3 &&
    skill.id === ABOMINATION_DOUBLE_FACED_SKILL_IDS[skill.level as 1 | 2 | 3]
  );
}

export function verifiedLevel1CombatSkillsForHero<
  T extends {
    readonly hero: string | null;
    readonly level: number;
    readonly id: string;
    readonly verification: { readonly unverified: boolean };
  },
>(heroName: string, skills: readonly T[]): T[] {
  return skills.filter(
    (skill) =>
      skillBelongsToFormalHero(heroName, skill) &&
      skill.level === 1 &&
      !skill.verification.unverified,
  );
}

export function embarkSkillAllowed(
  heroName: string,
  skill: {
    readonly hero: string | null;
    readonly level: number;
    readonly id: string;
    readonly verification: { readonly unverified: boolean };
    readonly rosterArtOnly?: boolean;
  },
): boolean {
  if (isFormalRosterArtSkill(skill)) return false;
  if (!skillBelongsToFormalHero(heroName, skill) || skill.level !== 1) return false;
  return !skill.verification.unverified;
}

export const FORMAL_PARTIAL_CORE_SKILL_HEROES = FORMAL_HEROES_PARTIAL_CORE_SKILLS;
