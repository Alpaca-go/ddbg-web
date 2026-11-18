import type { PendingChoice } from "../command";

/**
 * 玩家策略：优先选用不消耗等待代币的驿站复活补位（R-147–149），
 * 否则回退既有「首个合法选项」行为。
 */
export function pickNaturalReplacementOptionId(
  choice: PendingChoice,
  preferStagecoachRevival: boolean,
): string {
  if (preferStagecoachRevival) {
    const revived = choice.options.find((o) => o.id.startsWith("stagecoach:"));
    if (revived) return revived.id;
  }
  return choice.options[0]!.id;
}
