import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";

/** 页面只提供已接通的I级专属入口；完整准入检查仍由引擎执行。 */
export function RuinsBossRoomActions({
  dungeon: d,
  dispatch,
}: {
  dungeon: DungeonState;
  dispatch: DungeonDispatch;
}) {
  const entry = bossRoomEntry(d);
  if (!entry) return null;
  return (
    <div data-testid={`${entry.id}-room-actions`}>
      <p>
        在 {entry.roomName} 部署英雄与 {entry.name}，然后开始 Boss 战。
      </p>
      <button
        disabled={
          !!(d.pending || d.deathTrinketChoice || d.replacementPreparation || d.campaignFailure)
        }
        onClick={() => dispatch({ type: entry.command })}
      >
        部署 {entry.name} 战斗
      </button>
    </div>
  );
}

const entries = [
  {
    id: "necromancer",
    name: "Necromancer I",
    roomName: "Necromancer Room",
    room: "room:p010",
    script: "boss:ruins:necromancer:1",
    command: "deployNecromancerI",
  },
  {
    id: "prophet",
    name: "Prophet I",
    roomName: "Prophet Room",
    room: "room:p011",
    script: "boss:ruins:prophet:1",
    command: "deployProphetI",
  },
] as const;
function bossRoomEntry(d: DungeonState) {
  if (
    d.phase !== "awaitingRoom" ||
    d.roomCards?.active?.tileId !== undefined ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.campaignLevel !== 1 ||
    !["standard", "radiant"].includes(d.mode)
  )
    return undefined;
  return entries.find(
    (e) =>
      d.roomCards?.active?.cardId === e.room &&
      d.activeBossThreatScriptId === e.script &&
      d.faceTheThreatEmbarkPlan?.resolvedScriptId === e.script,
  );
}
export function ruinsBossRoomEntryVisible(d: DungeonState): boolean {
  return !!bossRoomEntry(d);
}
