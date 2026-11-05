import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function prophetIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "prophet", 2);
}
export function finishProphetIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "prophet", 2);
}
