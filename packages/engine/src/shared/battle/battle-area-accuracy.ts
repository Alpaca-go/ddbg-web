import type { BattleArea } from "./battle";

/** R-157：Toxic Vapors 站立 Acc −3；只投影已确认且 runtimeReady 的区域。 */
export function heroStandingAccuracyModifier(area: BattleArea | undefined): number {
  return area?.toxicVapors ? -3 : 0;
}
