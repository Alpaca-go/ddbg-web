import type { ApplyResult, GameState } from "../../../shared/core/command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "../ruins/ruins-i-finish";

export function fanaticIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "fanatic", 2);
}
export function finishFanaticIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "fanatic", 2);
}
