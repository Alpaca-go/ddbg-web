import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function prophetIIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "prophet", 3);
}
export function finishProphetIIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "prophet", 3);
}
