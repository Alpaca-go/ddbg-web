import type { CampaignLevel } from "../../../data/src/core/quests/basic-quests";
/** Weald 扩展 三 Boss（spec 扩展 §2.3；迫近威胁池已接线）。 */
export type WealdBossIdentity = "hag" | "brigandPounder" | "shrieker";

export const WEALD_BOSS_DESCRIPTION_CARD_ID: Record<
  WealdBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  hag: {
    1: "boss_ability:weald:p013", // R-254：描述目录不依赖战斗脚本初始化顺序。
    2: "boss_ability:weald:p014",
    3: "boss_ability:weald:p015",
  },
  brigandPounder: {
    1: "boss_ability:weald:p007",
    2: "boss_ability:weald:p008",
    3: "boss_ability:weald:p009",
  },
  shrieker: {
    1: "boss_ability:weald:p001",
    2: "boss_ability:weald:p002",
    3: "boss_ability:weald:p003",
  },
};

export const WEALD_BOSS_IDENTITIES: readonly WealdBossIdentity[] = [
  "hag",
  "brigandPounder",
  "shrieker",
];
