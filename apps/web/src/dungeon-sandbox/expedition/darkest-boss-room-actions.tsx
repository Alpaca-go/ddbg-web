import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";

/** 最暗中途 Boss 已接通的生产 deploy；完整准入仍由引擎执行。 */
export function DarkestBossRoomActions({
  dungeon: d,
  dispatch,
}: {
  dungeon: DungeonState;
  dispatch: DungeonDispatch;
}) {
  const entry = darkestBossRoomEntry(d);
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
    id: "shuffling-horror",
    name: "Shuffling Horror",
    roomName: "Shuffling Horror Room",
    room: "room:p023",
    quest: "quest:p016",
    script: "boss:darkest:shuffling-horror",
    command: "deployShufflingHorrorI",
  },
  {
    id: "templars",
    name: "Templars",
    roomName: "Templars Room",
    room: "room:p022",
    quest: "quest:p017",
    script: "boss:darkest:templars",
    command: "deployTemplarsI",
  },
] as const;

function darkestBossRoomEntry(d: DungeonState) {
  if (!d.darkest || d.phase !== "awaitingRoom" || d.roomCards?.active?.tileId !== undefined)
    return undefined;
  const plan = d.darkest.bossEncounterPlan;
  const questId = d.questDistribution?.questId;
  if (questId !== "quest:p016" && questId !== "quest:p017") return undefined;
  return entries.find(
    (e) =>
      d.roomCards?.active?.cardId === e.room &&
      d.roomCards.active.roomId === d.position &&
      plan?.questId === e.quest &&
      plan.resolvedScriptId === e.script,
  );
}

export function darkestBossRoomEntryVisible(d: DungeonState): boolean {
  return !!darkestBossRoomEntry(d);
}
