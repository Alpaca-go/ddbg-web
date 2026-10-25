/** 正式替补：attributesVerified + 七张已核实 I 级战斗技能（含 Abomination 双面 Transform）。 */
export const VERIFIED_REPLACEMENT_NAMES = [
  "ABOMINATION",
  "ANTIQUARIAN",
  "ARBALEST",
  "BOUNTY HUNTER",
  "FLAGELLANT",
  "JESTER",
  "LEPER",
  "MAN-AT-ARMS",
  "HOUNDMASTER",
  "SHIELDBREAKER",
  "PLAGUE DOCTOR",
  "GRAVE ROBBER",
  "OCCULTIST",
  "MUSKETEER",
] as const;

export const VERIFIED_REPLACEMENT_STAT_IDS = [
  "hero_stat:p005:front",
  "hero_stat:warrens:antiquarian:p001:front",
  "hero_stat:p013:front",
  "hero_stat:p017:front",
  "hero_stat:p019:front",
  "hero_stat:p011:front",
  "hero_stat:warrens:leper:p001:front",
  "hero_stat:cove:flagellant:p001:front",
  "hero_stat:cove:man-at-arms:p001:front",
  "hero_stat:weald:houndmaster:p001:front",
  "hero_stat:weald:shieldbreaker:p001:front",
  "hero_stat:p015:front",
  "hero_stat:p021:front",
  "hero_stat:musketeer:musketeer:p001:front",
] as const;

/** 驿站 III 余额 4 的全灭夹具仍只准备原四名额外；其余三名替补仍在候选池。 */
export const VERIFIED_REMAINING_AFTER_FOUR_PREP = [
  "ABOMINATION",
  "ANTIQUARIAN",
  "ARBALEST",
  "JESTER",
  "LEPER",
  "FLAGELLANT",
  "MAN-AT-ARMS",
  "HOUNDMASTER",
  "SHIELDBREAKER",
  "MUSKETEER",
] as const;

export function verifiedReplacementNamesExcluding(...exclude: readonly string[]) {
  const blocked = new Set(exclude);
  return VERIFIED_REPLACEMENT_NAMES.filter((name) => !blocked.has(name)).sort();
}
