import { readShriekerRuntimeContext } from "./shrieker-runtime-context";
import { buildShriekerICombatCatalog } from "./shrieker-i-projection";
import type { ApplyResult } from "../../command";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";
import { shriekerINestRemovalIds } from "./shrieker-i-nest";

/** W3／R-261：本体死亡带走 Nest，共用清理负责事件和姿态补位。 */
export function clearShriekerINest(result: ApplyResult, ids: readonly string[]) {
  const b = result.state.battle;
  const d = result.state.dungeon;
  const context = readShriekerRuntimeContext(result.state);
  if (
    !b ||
    !d?.contentPacks?.includes("weald") ||
    !context ||
    d.imminentThreatDescriptionCardId !== context.abilities.descriptionCardId ||
    d.roomCards?.active?.tileId !== content.tile.id
  )
    return { result, ids };
  const removed = shriekerINestRemovalIds(b.entities, ids);
  if (!removed.length) {
    if (
      d.shriekerBossBattles &&
      b.monsters?.some((c) => c.skills.some((s) => s.shriekerFlight)) &&
      !b.entities.some((e) => !e.dead && e.monsterCardId === context.faces[1].rawId)
    ) {
      return {
        result: {
          ...result,
          state: {
            ...result.state,
            battle: {
              ...b,
              monsters:
                context.level === 1
                  ? buildShriekerICombatCatalog({ nestInPlay: false })
                  : context.catalog(false),
            },
          },
        },
        ids,
      };
    }
    return { result, ids };
  }
  return {
    ids: [...ids, ...removed],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...b,
          entities: b.entities.map((e) => (removed.includes(e.id) ? { ...e, dead: true } : e)),
        },
      },
    },
  };
}
