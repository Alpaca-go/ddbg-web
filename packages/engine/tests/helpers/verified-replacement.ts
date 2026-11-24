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
  "hero_stat:core:h03:p005:front",
  "hero_stat:warrens:h15:p030:front",
  "hero_stat:core:h07:p013:front",
  "hero_stat:core:h09:p017:front",
  "hero_stat:core:h10:p019:front",
  "hero_stat:core:h06:p011:front",
  "hero_stat:warrens:h14:p028:front",
  "hero_stat:cove:h13:p026:front",
  "hero_stat:cove:h12:p024:front",
  "hero_stat:weald:h17:p034:front",
  "hero_stat:weald:h16:p032:front",
  "hero_stat:core:h08:p015:front",
  "hero_stat:core:h11:p021:front",
  "hero_stat:musketeer:h18:p036:front",
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
