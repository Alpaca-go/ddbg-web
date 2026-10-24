/**
 * Kyries 方案 2：18 名英雄 STAT/SKILLS 印刷接线。
 * 扩展包路径对齐本机 EN_FILES（MG_DD_04 Warrens / 05 Cove / 06 Weald / 08 Musketeer / 10 TDH，包根扁平 PDF）。
 */

export const PRINT_18_HERO_NAMES = [
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
];

/** @typedef {{ pack: string, wave: 1|2, mgFolder: string, statFront: string, statBack: string, heroes: { hero: string, statPages: [number, number] }[] }} ExtensionPack */

/** @type {ExtensionPack[]} */
export const EXTENSION_STAT_PACKS = [
  {
    pack: "warrens",
    wave: 2,
    mgFolder: "MG_DD_04_EN_WARRENS",
    statFront: "DD_EN_WARRENS_CARDS_100x180_Hero_STAT_FRONT.pdf",
    statBack: "DD_EN_WARRENS_CARDS_100x180_Hero_STAT_BACK.pdf",
    heroes: [
      { hero: "ANTIQUARIAN", statPages: [1, 2] },
      { hero: "LEPER", statPages: [3, 4] },
    ],
  },
  {
    pack: "cove",
    wave: 2,
    mgFolder: "MG_DD_05_EN_COVE",
    statFront: "DD_EN_COVE_CARDS_100x180_Hero_STAT_FRONT.pdf",
    statBack: "DD_EN_COVE_CARDS_100x180_Hero_STAT_BACK.pdf",
    heroes: [
      { hero: "FLAGELLANT", statPages: [1, 2] },
      { hero: "MAN-AT-ARMS", statPages: [3, 4] },
    ],
  },
  {
    pack: "weald",
    wave: 2,
    mgFolder: "MG_DD_06_EN_WEALD",
    statFront: "DD_EN_WEALD_CARDS_100x180_Hero_STAT_FRONT.pdf",
    statBack: "DD_EN_WEALD_CARDS_100x180_Hero_STAT_BACK.pdf",
    heroes: [
      { hero: "HOUNDMASTER", statPages: [1, 2] },
      { hero: "SHIELDBREAKER", statPages: [3, 4] },
    ],
  },
  {
    pack: "musketeer",
    wave: 1,
    mgFolder: "MG_DD_08_EN_MUSKETEER",
    statFront: "DD_EN_MUSKETEER_CARDS_100x180_Hero_STAT_FRONT.pdf",
    statBack: "DD_EN_MUSKETEER_CARDS_100x180_Hero_STAT_BACK.pdf",
    heroes: [{ hero: "MUSKETEER", statPages: [1, 2] }],
  },
];

export const TDH_SKILLS_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_10_EN_The Darkest Heroes/DD_EN_THE_DARKEST_HEROES_CARDS_44x68_SKILLS_FRONT.pdf";

export const MUSKETEER_SKILLS_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_08_EN_MUSKETEER/DD_EN_MUSKETEER_CARDS_44x68_SKILLS_FRONT.pdf";

/** Extension combat skills (not in normalized corebox yet): TDH reprint pages 232–357 + Musketeer pack. */
export const EXTENSION_SKILL_BLOCKS = [
  { hero: "ANTIQUARIAN", pdfRel: TDH_SKILLS_FRONT, startPage: 232, count: 21 },
  { hero: "LEPER", pdfRel: TDH_SKILLS_FRONT, startPage: 253, count: 21 },
  { hero: "FLAGELLANT", pdfRel: TDH_SKILLS_FRONT, startPage: 274, count: 21 },
  { hero: "MAN-AT-ARMS", pdfRel: TDH_SKILLS_FRONT, startPage: 295, count: 21 },
  { hero: "HOUNDMASTER", pdfRel: TDH_SKILLS_FRONT, startPage: 316, count: 21 },
  { hero: "SHIELDBREAKER", pdfRel: TDH_SKILLS_FRONT, startPage: 337, count: 21 },
  { hero: "MUSKETEER", pdfRel: MUSKETEER_SKILLS_FRONT, startPage: 1, count: 21 },
];

export function expansionPrintRoot(wave, mgFolder) {
  const waveLabel = wave === 1 ? "WAVE_1" : "WAVE_2";
  return `DARKEST_DUNGEON_PRINT_EN_${waveLabel}/${mgFolder}`;
}

export function packStatPdfRel(pack, side) {
  const root = expansionPrintRoot(pack.wave, pack.mgFolder);
  const file = side === "front" ? pack.statFront : pack.statBack;
  return `${root}/${file}`;
}
