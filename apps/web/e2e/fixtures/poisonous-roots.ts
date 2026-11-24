import { poisonousRootsQuest as original } from "../../../../packages/engine/tests/helpers/poisonous-roots-quest";
import { applyCommand } from "../../../../packages/engine/src/shared/core/command";
/** 与页面新命令版本相同，保留原种子、动作及完整状态比较。 */
export function poisonousRootsQuest() {
  const fixture = original(),
    action = { ...fixture.action, inventoryOverflow: true as const, chainCrowding: true as const };
  return { ...fixture, action, after: applyCommand(fixture.before, action).state };
}
