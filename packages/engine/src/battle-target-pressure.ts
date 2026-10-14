import type { BattleState } from "./battle";
import type { ApplyResult, GameState, GameEvent } from "./command";
import type { HeroSkillResolution } from "./hero-skill";
import { resolveBattlePressure } from "./pressure";

/** R20：目标Shuffle是Target Effect，不能先移动再补做命中产生的压力检定。 */
export function beforeTargetShuffle(
  state: GameState,
  battle: BattleState,
  health: {
    readonly entities: BattleState["entities"];
    readonly rngCursor: number;
    readonly events: readonly GameEvent[];
  },
  resolutions: readonly HeroSkillResolution[],
): ApplyResult {
  const result = {
    state: {
      ...state,
      battle: { ...battle, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: health.events,
  };
  return resolutions.some((resolution) => resolution.targetShuffle)
    ? resolveBattlePressure(result)
    : result;
}
