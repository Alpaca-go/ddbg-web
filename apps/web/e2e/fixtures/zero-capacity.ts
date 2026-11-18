import { zeroCapacityQuest as original } from "../../../../packages/engine/src/test-helpers/zero-capacity-quest";
import { applyCommand } from "../../../../packages/engine/src/command";
/** 与页面启用同一版本，继续严格比较零容量进入、移出与穿过的全部状态。 */
export function zeroCapacityQuest() {
  const f = original(),
    enter = { ...f.enter, inventoryOverflow: true as const, chainCrowding: true as const },
    leave = { ...f.leave, inventoryOverflow: true as const, chainCrowding: true as const },
    through = { ...f.through, inventoryOverflow: true as const, chainCrowding: true as const };
  const paused = applyCommand(f.before, enter).state;
  return {
    ...f,
    enter,
    leave,
    through,
    paused,
    after: applyCommand(paused, leave).state,
    crossed: applyCommand(f.before, through).state,
  };
}
