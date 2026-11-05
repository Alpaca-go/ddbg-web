import type { ApplyResult, GameState } from "../command";
import { finishRuinsIBattle, ruinsIRealCombatActive } from "./ruins-i-finish";

export function necromancerIIIRealCombatActive(state: GameState): boolean {
  return ruinsIRealCombatActive(state, "necromancer", 3);
}
export function finishNecromancerIIIBattle(state: GameState): ApplyResult {
  return finishRuinsIBattle(state, "necromancer", 3);
}
