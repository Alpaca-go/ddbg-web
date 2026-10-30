import type { GameState, ApplyResult } from "./command";
import { resolveCurioRows } from "./dungeon-curio-effects";
/** R-133 / R-134：免费效果不消耗村庄行动；死亡保留原来的行动槽。 */
export function settleFreeTrinket(state: GameState): ApplyResult {
  const d = state.dungeon!;
  if (!d.heroes.some((h) => h.dead)) return { state, events: [] };
  if (d.phase === "inHamlet" && d.hamletReturn)
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          hamletReturn: { ...d.hamletReturn, phase: "awaitingReplacement" },
          replacementResume: "hamletTrinket",
        },
      },
      events: [],
    };
  if (d.phase === "awaitingCurio" && d.heroes.find((h) => h.id === d.curio?.active?.heroId)?.dead)
    return resolveCurioRows(state);
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        phase: "awaitingReplacement",
        replacementResume: d.phase === "awaitingCurio" ? "curio" : "ready",
      },
    },
    events: [],
  };
}
