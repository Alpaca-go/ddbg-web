import { ruinsCombatForScript, isRuinsCombatCard } from "./ruins-combat-levels";
import type { GameState } from "../command";
import { resolveEncounterBossScriptId } from "./encounter-rules";

/** R39 / room:p012：三个宝箱在同一个指定区域；不是 Collect All 的三种召唤落区。 */
export const COLLECTOR_ROOM_CARD_ID = "room:p012" as const;
export const COLLECTOR_ROOM_LOOT_COUNT = 3 as const;

export function readCollectorIRoomLootPlacement(
  state: GameState,
):
  | { readonly status: "notApplicable" }
  | { readonly status: "refused"; readonly message: string }
  | { readonly status: "ready"; readonly placements: readonly string[] } {
  const battle = state.battle;
  if (
    !battle ||
    !ruinsCombatForScript("collector", resolveEncounterBossScriptId(state)) ||
    !battle.entities.some(
      (e) => e.side === "monster" && !e.dead && isRuinsCombatCard("collector", e.monsterCardId),
    )
  )
    return { status: "notApplicable" };
  const areaId = battle.collectorRoomLootAreaId;
  if (!areaId || !battle.areas.some((a) => a.id === areaId))
    return {
      status: "refused",
      message: "Collector Room 三宝箱缺少已核实的区域绑定（R39、R-048）；正式几何仍 hold",
    };
  const activeRoom = state.dungeon?.roomCards?.active?.cardId;
  if (activeRoom && activeRoom !== COLLECTOR_ROOM_CARD_ID)
    return { status: "refused", message: "Collector 宝箱布置与当前房间身份不符（R-048）" };
  if (battle.loot || battle.lootAreas?.some((id) => id !== areaId))
    return {
      status: "refused",
      message: "Collector 宝箱已布置或与房间标记冲突，不能覆盖 / 重抽（R-047、R-048）",
    };
  return {
    status: "ready",
    placements: Array.from({ length: COLLECTOR_ROOM_LOOT_COUNT }, () => areaId),
  };
}
