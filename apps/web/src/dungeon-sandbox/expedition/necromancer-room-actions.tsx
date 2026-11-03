import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";

/** 页面只提供已接通的I级专属入口；完整准入检查仍由引擎执行。 */
export function NecromancerRoomActions({
  dungeon: d,
  dispatch,
}: {
  dungeon: DungeonState;
  dispatch: DungeonDispatch;
}) {
  if (!necromancerRoomEntryVisible(d)) return null;
  return (
    <div data-testid="necromancer-room-actions">
      <p>在 Necromancer Room 部署英雄与 Necromancer I，然后开始 Boss 战。</p>
      <button
        disabled={
          !!(d.pending || d.deathTrinketChoice || d.replacementPreparation || d.campaignFailure)
        }
        onClick={() => dispatch({ type: "deployNecromancerI" })}
      >
        部署 Necromancer I 战斗
      </button>
    </div>
  );
}

export function necromancerRoomEntryVisible(d: DungeonState): boolean {
  return !(
    d.phase !== "awaitingRoom" ||
    d.roomCards?.active?.cardId !== "room:p010" ||
    d.roomCards.active.tileId !== undefined ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.campaignLevel !== 1 ||
    d.activeBossThreatScriptId !== "boss:ruins:necromancer:1" ||
    d.faceTheThreatEmbarkPlan?.resolvedScriptId !== "boss:ruins:necromancer:1" ||
    !["standard", "radiant"].includes(d.mode)
  );
}
