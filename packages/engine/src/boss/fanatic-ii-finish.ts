import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function fanaticIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "fanatic", 2);
}
export function finishFanaticIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "fanatic", 2);
}
