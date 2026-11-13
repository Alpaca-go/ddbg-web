import type { GameState } from "../../command";
import { rejectBattleCommand } from "../../battle";
import type { WealdRoomTile } from "../../../../data/src/weald-room";
import { withTeleporterAdjacency } from "../../battle-teleporters";
import type { BattleArea } from "../../battle";

export function wealdPackSelected(packs: readonly string[] | undefined): boolean {
  return packs?.includes("weald") === true;
}

export function wealdMechanicsActive(state: GameState): boolean {
  return wealdPackSelected(state.dungeon?.contentPacks) && state.battle?.wealdMechanics === true;
}

/** 从核准板块投影战斗区域；仅 wealdMechanics 为 true 时标记 W-03 零容量。 */
export function wealdRoomTileBattleAreas(
  tile: Pick<
    WealdRoomTile,
    "geometryVerified" | "areas" | "edges" | "zeroCapacityAreas" | "specialRegions"
  >,
  options: { readonly wealdMechanics: boolean },
): readonly BattleArea[] {
  if (tile.geometryVerified !== true) throw new Error("Weald 房间几何尚未核实（R-048）");
  const zeroSet = new Set(tile.zeroCapacityAreas);
  const areas = tile.areas.map((area) => ({
    id: area.id,
    capacity: area.capacity,
    elevation: area.elevation,
    ...(options.wealdMechanics && (area.zeroCapacity === true || zeroSet.has(area.id))
      ? { zeroCapacity: true as const }
      : {}),
    ...(tile.specialRegions?.some(
      (region) =>
        region.areaId === area.id &&
        region.effect === "poisonousRoots" &&
        region.status === "confirmed" &&
        region.runtimeReady,
    )
      ? { poisonousRoots: true as const }
      : {}),
    adjacent: tile.edges
      .filter(
        (edge) =>
          !edge.blocked && !edge.cornerOnly && (edge.from === area.id || edge.to === area.id),
      )
      .map((edge) => (edge.from === area.id ? edge.to : edge.from))
      .sort(),
  }));
  return withTeleporterAdjacency(areas);
}

export function wealdZeroCapacityEndTurnRefusal(state: GameState, actorId: string): string | null {
  if (!wealdMechanicsActive(state)) return null;
  const battle = state.battle!;
  const actor = battle.entities.find((e) => e.id === actorId);
  if (!actor || actor.dead) return null;
  const area = battle.areas.find((a) => a.id === actor.areaId);
  if (area?.zeroCapacity === true) return "零容量区域不能结束回合，须经该区域穿过（W-03）";
  return null;
}

export function rejectIfWealdZeroCapacityEndTurn(state: GameState, actorId: string) {
  const reason = wealdZeroCapacityEndTurnRefusal(state, actorId);
  return reason ? rejectBattleCommand(state, reason) : null;
}
