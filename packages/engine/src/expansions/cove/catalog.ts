import type { CampaignLevel } from "../../../../data/src/basic-quests";
import { SIREN_I_DESCRIPTION_ABILITY_CARD_ID } from "./boss/siren-i";
/** Cove 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type CoveBossIdentity = "siren" | "shambler" | "drownedCrew";

export const COVE_BOSS_DESCRIPTION_CARD_ID: Record<
  CoveBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  siren: {
    1: SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  shambler: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
  drownedCrew: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
};

export const COVE_BOSS_IDENTITIES: readonly CoveBossIdentity[] = [
  "siren",
  "shambler",
  "drownedCrew",
];
