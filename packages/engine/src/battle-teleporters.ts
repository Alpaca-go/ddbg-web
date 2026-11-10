import { rejectBattleCommand } from "./battle";
import type { BattleArea } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { endAfterCasualties, newlyDefeatedIds, removeCasualties } from "./encounter";
import { triggerBattlePassive } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";

/** R-159：橙星区 A/C/F/H；只投影已确认且 runtimeReady 的 teleporters。 */
export function teleporterLinkedAreaIds(areas: readonly BattleArea[]): readonly string[] {
  return areas
    .filter((area) => area.teleporter)
    .map((area) => area.id)
    .sort();
}

/** 实体边之外，橙星区两两虚拟邻接（R-159；不写入 tile.edges）。 */
export function withTeleporterAdjacency(areas: readonly BattleArea[]): readonly BattleArea[] {
  const links = teleporterLinkedAreaIds(areas);
  if (links.length < 2) return areas;
  return areas.map((area) => {
    if (!area.teleporter) return area;
    const adjacent = [
      ...new Set([...area.adjacent, ...links.filter((id) => id !== area.id)]),
    ].sort();
    return adjacent.length === area.adjacent.length &&
      adjacent.every((id, index) => id === area.adjacent[index])
      ? area
      : { ...area, adjacent };
  });
}

/**
 * R-159：英雄移动路径上每步橙星区压力 +1（df38279161）。
 * 最小解释：只统计 `moveHero.path` 中的区域，不含起点；逐步分别触发（Q-145）。
 */
export function applyHeroTeleporterMoveStress(
  state: GameState,
  actorId: string,
  path: readonly string[],
  priorEvents: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle;
  if (!battle || !path.length) return { state, events: [...priorEvents] };
  const actor = battle.entities.find((entry) => entry.id === actorId);
  if (!actor || actor.side !== "hero" || actor.dead) return { state, events: [...priorEvents] };

  const through = path.flatMap((id) =>
    battle.areas.filter((area) => area.id === id && area.teleporter),
  );
  if (!through.length) return { state, events: [...priorEvents] };

  let result: ApplyResult = { state, events: [...priorEvents] };
  for (const area of through) {
    const live = result.state.battle!;
    const hero = live.entities.find((entry) => entry.id === actorId)!;
    if (hero.dead) break;
    if (!Number.isSafeInteger(hero.stress) || hero.stress! < 0 || hero.stress! > 10)
      return rejectBattleCommand(result.state, "Teleporters 压力需要已知英雄压力（R-048）");
    const amount = area.teleporterStress ?? 1;
    const passive = triggerBattlePassive(live, result.state.seed, [actorId], {
      type: "stress",
      amount,
    });
    if (passive.status === "refused") return rejectBattleCommand(result.state, passive.reason);
    const pressure = resolveBattlePressure({
      state: { ...result.state, battle: passive.battle },
      events: [
        ...result.events,
        ...passive.events,
        {
          type: "areaStressResolved",
          actorId,
          message: `Teleporters：英雄穿过橙星区 ${area.id} 压力 +${amount}（R-159；Q-145）`,
        },
      ],
    });
    if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
    result = removeCasualties(pressure, newlyDefeatedIds(live, pressure.state.battle!.entities));
    const ended = endAfterCasualties(result);
    if (ended) return ended;
  }
  return result;
}
