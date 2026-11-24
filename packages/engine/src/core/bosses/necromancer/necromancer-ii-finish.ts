import type { ApplyResult, GameState } from "../../../shared/core/command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "../ruins/ruins-i-finish";

export function necromancerIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "necromancer", 2);
}
export function finishNecromancerIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "necromancer", 2);
}
