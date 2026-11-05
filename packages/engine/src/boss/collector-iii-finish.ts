import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function collectorIIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "collector", 3);
}
export function finishCollectorIIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "collector", 3);
}
