import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function fanaticIIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "fanatic", 3);
}
export function finishFanaticIIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "fanatic", 3);
}
