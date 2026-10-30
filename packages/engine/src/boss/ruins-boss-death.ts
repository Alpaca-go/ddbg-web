import type { ApplyResult } from "../command";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { RUINS_COMBAT_LEVELS, ruinsCombatForScript } from "./ruins-combat-levels";

/** R39：收藏家死亡移出剩余 Collected；先知死亡移出 Wooden Pews。 */
export function clearRuinsBossCompanions(result: ApplyResult, ids: readonly string[]) {
  const b = result.state.battle!;
  const id = resolveEncounterBossScriptId(result.state);
  const collector = ruinsCombatForScript("collector", id);
  const prophet = ruinsCombatForScript("prophet", id);
  const row = collector ?? prophet;
  if (!row || !b.entities.some((e) => e.monsterCardId === row.card && e.dead && ids.includes(e.id)))
    return { result, ids };
  const collected = new Set<string>(
    RUINS_COMBAT_LEVELS.collector.flatMap((e) => Object.values(e.collected)),
  );
  const removed = collector
    ? b.entities.filter((e) => e.side === "monster" && !e.dead && collected.has(e.monsterCardId!))
    : [];
  return {
    ids: [...ids, ...removed.map((e) => e.id)],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...b,
          ...(prophet ? { woodenPews: [] } : {}),
          entities: b.entities.map((e) => (removed.includes(e) ? { ...e, dead: true } : e)),
        },
      },
    },
  };
}
