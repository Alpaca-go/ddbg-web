import type { ApplyResult, GameState } from "../../../shared/core/command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "../ruins/ruins-i-finish";

export function collectorIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "collector", 2);
}
export function finishCollectorIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "collector", 2);
}
