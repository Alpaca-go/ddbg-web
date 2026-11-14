import type { CampaignLevel } from "../../../../data/src/basic-quests";
import { HAG_I_DESCRIPTION_ABILITY_CARD_ID } from "./boss/hag-i";
/** Weald 扩展 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type WealdBossIdentity = "hag" | "brigandPounder" | "shrieker";

export const WEALD_BOSS_DESCRIPTION_CARD_ID: Record<
  WealdBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  hag: {
    1: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  brigandPounder: {
    1: "boss_ability:weald:p007",
    2: undefined,
    3: undefined,
  },
  shrieker: {
    1: "boss_ability:weald:p001",
    2: undefined,
    3: undefined,
  },
};

export const WEALD_BOSS_IDENTITIES: readonly WealdBossIdentity[] = [
  "hag",
  "brigandPounder",
  "shrieker",
];
