import type { GameState } from "./command";
import { planCrowding } from "./crowding";
import { createRng } from "./rng";
import { shriekerINestAllowsEntry } from "./expansions/weald/boss/shrieker-i-nest";

/** R-271：预演完成才提交位移和用于平局的 RNG；不占姿态、不洗先攻由调用方处理。 */
export function planSummonCrowding(state: GameState, areaId: string, width: 1 | 2) {
  const battle = state.battle!;
  const random = (offset: number) => {
    const rng = createRng(state.seed);
    for (let i = 0; i < battle.rngCursor + offset; i++) rng.next();
    return rng.next();
  };
  const plan = planCrowding(
    battle.areas,
    battle.entities,
    areaId,
    width,
    random,
    () => false,
    (e, id) => shriekerINestAllowsEntry(battle.entities, e, id),
  );
  return plan
    ? {
        battle: { ...battle, entities: plan.entities, rngCursor: battle.rngCursor + plan.rolls },
        areaId,
      }
    : { status: "invalid" as const };
}
