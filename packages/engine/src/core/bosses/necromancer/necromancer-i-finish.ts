import type { ApplyResult, GameState } from "../../../shared/core/command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "../ruins/ruins-i-finish";

export function necromancerIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "necromancer");
}
export function finishNecromancerIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "necromancer");
}
