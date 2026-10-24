import type { FormalHeroName } from "./formal-heroes";
import { isFormalHeroName } from "./formal-heroes";

/** 十一名核心盒已核实属性（与 normalized hero_stat 一致）；扩展七名为建队印刷接线 + 占位属性（R-048）。 */
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
];

/** 核心盒两名：STAT 与七张 I 级战斗技能均已核实接线（R-102/R-103，2026-10-24）。 */
export const FORMAL_HEROES_PARTIAL_CORE_SKILLS: readonly FormalHeroName[] = [];

/** Abomination 双面变身卡：规范化 `hero` 为 null，出征/替补按英雄归属。 */
export const ABOMINATION_DOUBLE_FACED_SKILL_IDS: Record<1 | 2 | 3, string> = {
  1: "hero_skill:p220",
  2: "hero_skill:p221",
  3: "hero_skill:p222",
};

const EXTENSION_ROSTER_HEROES: readonly FormalHeroName[] = [
  "FLAGELLANT",
  "MAN-AT-ARMS",
  "HOUNDMASTER",
  "SHIELDBREAKER",
  "MUSKETEER",
];

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
  MUSKETEER: "hero_stat:musketeer:musketeer:p001:front",
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

const EXTENSION_SKILL_BLOCKS = [
  { hero: "FLAGELLANT" as const, startPage: 274, count: 21 },
  { hero: "MAN-AT-ARMS" as const, startPage: 295, count: 21 },
  { hero: "HOUNDMASTER" as const, startPage: 316, count: 21 },
  { hero: "SHIELDBREAKER" as const, startPage: 337, count: 21 },
  { hero: "MUSKETEER" as const, startPage: 1, count: 21 },
];

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

export type FormalRosterSkill = {
  readonly id: string;
  readonly hero: string;
  readonly level: number;
  readonly name: string;
  readonly verification: { readonly unverified: true; readonly reasons: readonly string[] };
  readonly rosterArtOnly: true;
  readonly printed_labels: readonly [];
  readonly unlabeled_numbers: readonly [];
  readonly effect_lines: readonly [];
  readonly stats_line: null;
};

function slug(hero: string) {
  return hero.toLowerCase().replace(/\s+/g, "-");
}

function extensionLevel1SkillIds(hero: FormalHeroName): readonly string[] {
  const block = EXTENSION_SKILL_BLOCKS.find((b) => b.hero === hero);
  if (!block) return [];
  const ids: string[] = [];
  for (let i = 0; i < block.count; i += 1) {
    if ((i % 3) + 1 !== 1) continue;
    const printPage = block.startPage + i;
    ids.push(`hero_skill:art:${slug(hero)}:p${String(printPage).padStart(3, "0")}`);
  }
  return ids;
}

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

function rosterArtSkill(id: string, hero: string, level: number, slot: number): FormalRosterSkill {
  return {
    id,
    hero,
    level,
    name: `Skill ${slot} (art-only)`,
    verification: { unverified: true, reasons: ["roster-art-only"] },
    rosterArtOnly: true,
    printed_labels: [],
    unlabeled_numbers: [],
    effect_lines: [],
    stats_line: null,
  };
}

export function formalRosterArtOnlySkills(): readonly FormalRosterSkill[] {
  const out: FormalRosterSkill[] = [];
  for (const block of EXTENSION_SKILL_BLOCKS) {
    for (let i = 0; i < block.count; i += 1) {
      const level = (i % 3) + 1;
      const skillSlot = Math.floor(i / 3) + 1;
      const printPage = block.startPage + i;
      const id = `hero_skill:art:${slug(block.hero)}:p${String(printPage).padStart(3, "0")}`;
      out.push(rosterArtSkill(id, block.hero, level, skillSlot));
    }
  }
  return out;
}

export function formalRosterLevel1ArtSkillIds(hero: FormalHeroName): readonly string[] {
  if (!(EXTENSION_ROSTER_HEROES as readonly string[]).includes(hero)) return [];
  return extensionLevel1SkillIds(hero);
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
  if (!skillBelongsToFormalHero(heroName, skill) || skill.level !== 1) return false;
  if (!skill.verification.unverified) return true;
  return isFormalRosterArtSkill(skill) && isFormalHeroRosterPendingAttributes(heroName);
}

export const FORMAL_PARTIAL_CORE_SKILL_HEROES = FORMAL_HEROES_PARTIAL_CORE_SKILLS;
