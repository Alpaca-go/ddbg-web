import { ruinsCombatForScript, isRuinsCombatCard } from "./ruins-combat-levels";
import type { BattleState } from "../battle";
import type { GameState } from "../command";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { PROPHET_ROOM_CARD_ID, PROPHET_ROOM_D10_MARKERS } from "./prophet-i";

/** 只验证已提供的逻辑区绑定；不从房间图片生成区域、坐标或邻接。 */
export function readProphetIRoomD10Binding(state: GameState):
  | { readonly status: "notApplicable" }
  | { readonly status: "refused"; readonly message: string }
  | {
      readonly status: "ready";
      readonly table: NonNullable<BattleState["prophetRoomD10AreaTable"]>;
    } {
  const battle = state.battle;
  if (
    !battle ||
    !ruinsCombatForScript("prophet", resolveEncounterBossScriptId(state)) ||
    !battle.entities.some(
      (e) => e.side === "monster" && !e.dead && isRuinsCombatCard("prophet", e.monsterCardId),
    )
  )
    return { status: "notApplicable" };
  const table = battle.prophetRoomD10AreaTable;
  if (!Array.isArray(table) || table.length !== PROPHET_ROOM_D10_MARKERS.length)
    return {
      status: "refused",
      message: "Prophet Room 缺少完整八组 d10 区域绑定（R38、R-048；生产几何仍 hold）",
    };
  const expected = new Set<string>(PROPHET_ROOM_D10_MARKERS);
  const seen = new Set<string>();
  const areaIds = new Set(battle.areas.map((a) => a.id));
  for (const binding of table) {
    if (!binding || !expected.has(binding.marker) || seen.has(binding.marker))
      return { status: "refused", message: "Prophet Room d10 印刷标记缺失、重复或未知（R-048）" };
    if (!areaIds.has(binding.areaId))
      return { status: "refused", message: "Prophet Room d10 引用未绑定的战斗区域（R-048）" };
    seen.add(binding.marker);
  }
  const activeRoom = state.dungeon?.roomCards?.active?.cardId;
  if (activeRoom && activeRoom !== PROPHET_ROOM_CARD_ID)
    return { status: "refused", message: "Prophet d10 绑定与当前房间身份不符（R-048）" };
  return { status: "ready", table };
}
