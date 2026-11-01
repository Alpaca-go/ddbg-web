import type { GameState } from "../command";
import { createRng } from "../rng";

/** R31 / spec §6：召唤成功后，将一张怪物先攻卡洗入当前剩余牌堆。 */
export function insertReflectionInitiative(state: GameState): GameState {
  const b = state.battle;
  if (!b?.encounter) return state;
  const rng = createRng(state.seed);
  for (let i = 0; i < b.rngCursor; i++) rng.next();
  const deck = [...b.encounter.deck];
  deck.splice(Math.floor(rng.next() * (deck.length + 1)), 0, "monster");
  return {
    ...state,
    battle: { ...b, rngCursor: b.rngCursor + 1, encounter: { ...b.encounter, deck } },
  };
}
