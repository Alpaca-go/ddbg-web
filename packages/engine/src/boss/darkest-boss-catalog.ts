import { MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";
import {
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";

/** 最暗中途 Boss 正式网页战斗目录（不含 II/III 扩展）。R-181 Templars；R-183 Shuffling Horror；R-185 Mammoth Cyst。 */
export const DARKEST_BOSS_CATALOG_CARD_IDS = new Set<string>([
  MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
]);
