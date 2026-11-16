import medium from "../../../../../data/normalized/corebox/monster_medium.json";
import large from "../../../../../data/normalized/corebox/monster_large.json";
import type { ApplyResult } from "../../../command";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";
import { readPounderRuntimeContext } from "./pounder-runtime-context";

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
  const context = readPounderRuntimeContext(result.state);
  if (
    !b ||
    !d?.pounderDungeonThreats ||
    !d.pounderHamletThreats ||
    d.roomCards?.active?.tileId !== content.tile.id ||
    !context ||
    !b.entities.some(
      (e) =>
        e.side === "monster" &&
        e.monsterCardId === context.pounderCardId &&
        e.dead &&
        ids.includes(e.id),
    )
  )
    return { result, ids };
  const actualBrigands =
    context.level === 1
      ? brigands
      : new Set([
          context.matchmanCardId,
          ...[...medium.cards, ...large.cards]
            .filter((c) => c.name.startsWith("Brigand "))
            .map((c) => c.id),
        ]);
  const removed = b.entities.filter(
    (e) => e.side === "monster" && !e.dead && actualBrigands.has(e.monsterCardId!),
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
