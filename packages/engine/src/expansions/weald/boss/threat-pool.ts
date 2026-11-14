import type { CampaignLevel } from "../../../../../data/src/basic-quests";
import type { DungeonState } from "../../../dungeon";
import {
  imminentThreatPoolForCampaign,
  RUINS_BOSS_IDENTITIES,
} from "../../../boss/threat-description-catalog";
import { WEALD_BOSS_IDENTITIES, WEALD_BOSS_DESCRIPTION_CARD_ID } from "../catalog";

/** W3：完整启用地点描述池；未实现战斗的 Boss 不能从概率池剔除。 */
export function wealdThreatPool(
  d: Pick<
    DungeonState,
    "contentPacks" | "defeatedRuinsBossIdentities" | "defeatedWealdBossIdentities"
  >,
  level: CampaignLevel,
): readonly string[] {
  const packs = d.contentPacks;
  if (
    !packs?.includes("core") ||
    !packs.includes("weald") ||
    new Set(packs).size !== packs.length ||
    packs.some((p) => p !== "core" && p !== "weald")
  )
    throw new Error("地点威胁入口当前仅支持显式核心＋Weald；其它地点来源尚未核准接通（W3／R-048）");
  if (level !== 1) throw new Error("Weald II／III 级 Boss 描述来源尚未核准接通（W3／R-048）");
  const ruins = d.defeatedRuinsBossIdentities ?? [];
  if (
    new Set(ruins).size !== ruins.length ||
    ruins.some((id) => !RUINS_BOSS_IDENTITIES.includes(id))
  )
    throw new Error("遗迹 Boss 击败记录无效");
  const defeated = d.defeatedWealdBossIdentities ?? [];
  if (
    new Set(defeated).size !== defeated.length ||
    defeated.some((id) => !WEALD_BOSS_IDENTITIES.includes(id))
  )
    throw new Error("Weald Boss 击败记录无效");
  return [
    ...imminentThreatPoolForCampaign(level, d.defeatedRuinsBossIdentities ?? []),
    ...WEALD_BOSS_IDENTITIES.filter((id) => !defeated.includes(id)).map(
      (id) => WEALD_BOSS_DESCRIPTION_CARD_ID[id][level]!,
    ),
  ];
}
