import type { CampaignLevel } from "../../../../data/src/basic-quests";
import { SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID } from "./boss/swine-prince-i";
import { FLESH_I_DESCRIPTION_ABILITY_CARD_ID } from "./boss/flesh-i";
/** Warrens 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type WarrensBossIdentity = "swinePrince" | "flesh" | "brigandVvulf";

export const WARRENS_BOSS_DESCRIPTION_CARD_ID: Record<
  WarrensBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  swinePrince: {
    1: SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  flesh: {
    1: FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  brigandVvulf: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
};

export const WARRENS_BOSS_IDENTITIES: readonly WarrensBossIdentity[] = [
  "swinePrince",
  "flesh",
  "brigandVvulf",
];
