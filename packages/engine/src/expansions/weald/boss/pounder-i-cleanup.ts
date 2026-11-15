import medium from "../../../../../data/normalized/corebox/monster_medium.json";
import large from "../../../../../data/normalized/corebox/monster_large.json";
import type { ApplyResult } from "../../../command";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";

// W4：按真实卡名与等级识别 Brigands，不按 Human 类型扩大清场范围。
const brigands = new Set<string>([
  content.faces[1].rawId,
  ...[...medium.cards, ...large.cards]
    .filter((c) => c.level === 1 && c.name.startsWith("Brigand "))
    .map((c) => c.id),
]);

/** W4／R-258：本体刚被击败时，其余 Brigands 走已有移出与姿态补位流程。 */
export function clearPounderIBrigands(result: ApplyResult, ids: readonly string[]) {
  const b = result.state.battle;
  const d = result.state.dungeon;
  if (
    !b ||
    !d?.pounderDungeonThreats ||
    !d.pounderHamletThreats ||
    d.roomCards?.active?.tileId !== content.tile.id ||
    resolveEncounterBossScriptId(result.state) !== POUNDER_I_SCRIPT_ID ||
    !b.entities.some(
      (e) =>
        e.side === "monster" &&
        e.monsterCardId === content.faces[0].rawId &&
        e.dead &&
        ids.includes(e.id),
    )
  )
    return { result, ids };
  const removed = b.entities.filter(
    (e) => e.side === "monster" && !e.dead && brigands.has(e.monsterCardId!),
  );
  return {
    ids: [...ids, ...removed.map((e) => e.id)],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...b,
          entities: b.entities.map((e) => (removed.includes(e) ? { ...e, dead: true } : e)),
        },
      },
    },
  };
}
