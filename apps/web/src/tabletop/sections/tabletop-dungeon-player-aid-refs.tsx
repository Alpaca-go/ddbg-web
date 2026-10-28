import { TabletopExplorationPlayerAid } from "./tabletop-exploration-player-aid";
import { TabletopProvisionPlayerAid } from "./tabletop-provision-player-aid";
import { TabletopRoomsPlayerAid } from "./tabletop-rooms-player-aid";

/** 地牢探索阶段牌堆侧：补给 / 探索 / 房间 三张辅助卡 reference（R-049 双面卡 FRONT+BACK）。 */
export function TabletopDungeonPlayerAidRefs({
  testIdPrefix = "tabletop-dungeon",
}: {
  readonly testIdPrefix?: string;
}) {
  return (
    <div className="tt-player-aid-ref-stack" data-testid={`${testIdPrefix}-player-aid-refs`}>
      <TabletopProvisionPlayerAid testId={`${testIdPrefix}-provision-aid`} />
      <TabletopExplorationPlayerAid testId={`${testIdPrefix}-exploration-aid`} />
      <TabletopRoomsPlayerAid testId={`${testIdPrefix}-rooms-aid`} />
    </div>
  );
}
