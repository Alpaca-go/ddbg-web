import { monsterZeroCapacityQuest as original } from "../../../../packages/engine/src/test-helpers/monster-zero-capacity-quest";
import { applyCommand } from "../../../../packages/engine/src/command";
/** 仅更新页面命令版本，非法机制检查点仍保持原状态。 */
export function monsterZeroCapacityQuest() {
  const fixture = original(),
    action = { ...fixture.action, inventoryOverflow: true as const, chainCrowding: true as const },
    skill = { ...fixture.skill, inventoryOverflow: true as const, chainCrowding: true as const };
  const after = applyCommand(fixture.before, action).state;
  return { ...fixture, action, skill, after, finished: applyCommand(after, skill).state };
}
