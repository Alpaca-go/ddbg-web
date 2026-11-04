import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import {
  IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  PERFECT_REFLECTION_MONSTER_CARD_ID,
} from "./ancestor1-reflections-guard";
import { ANCESTOR_2_MONSTER_CARD_ID } from "./ancestor2-swift-teleportation";
import { MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";
import {
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";
import { HEART_OF_DARKNESS_MONSTER_CARD_ID } from "./heart-of-darkness-impending-doom";

/** 最终战四形态 + Reflections 支援卡（`darkest_boss_content.finalBattle`）。R-187 正式目录。 */
export const FINAL_BATTLE_BOSS_CATALOG_CARD_IDS = [
  ANCESTOR_1_MONSTER_CARD_ID,
  PERFECT_REFLECTION_MONSTER_CARD_ID,
  IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  ANCESTOR_2_MONSTER_CARD_ID,
  GESTATING_HEART_MONSTER_CARD_ID,
  HEART_OF_DARKNESS_MONSTER_CARD_ID,
] as const;

/** 最暗 Boss 正式网页战斗目录（不含 II/III 扩展）。R-181 Templars；R-183 Shuffling Horror；R-185 Mammoth Cyst；R-187 最终战形态。 */
export const DARKEST_BOSS_CATALOG_CARD_IDS = new Set<string>([
  MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  ...FINAL_BATTLE_BOSS_CATALOG_CARD_IDS,
]);
