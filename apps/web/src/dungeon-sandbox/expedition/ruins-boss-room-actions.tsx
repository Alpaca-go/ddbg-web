import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";

/** 页面只提供已接通的 I/II/III 级专属入口；完整准入检查仍由引擎执行。 */
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
    level: 1,
    name: "Necromancer I",
    roomName: "Necromancer Room",
    room: "room:p010",
    script: "boss:ruins:necromancer:1",
    command: "deployNecromancerI",
  },
  {
    id: "necromancer-2",
    level: 2,
    name: "Necromancer II",
    roomName: "Necromancer Room",
    room: "room:p010",
    script: "boss:ruins:necromancer:2",
    command: "deployNecromancerII",
  },
  {
    id: "necromancer-3",
    level: 3,
    name: "Necromancer III",
    roomName: "Necromancer Room",
    room: "room:p010",
    script: "boss:ruins:necromancer:3",
    command: "deployNecromancerIII",
  },
  {
    id: "prophet",
    level: 1,
    name: "Prophet I",
    roomName: "Prophet Room",
    room: "room:p011",
    script: "boss:ruins:prophet:1",
    command: "deployProphetI",
  },
  {
    id: "collector",
    level: 1,
    name: "Collector I",
    roomName: "Collector Room",
    room: "room:p012",
    script: "boss:ruins:collector:1",
    command: "deployCollectorI",
  },
  {
    id: "fanatic",
    level: 1,
    name: "Fanatic I",
    roomName: "Fanatic Room",
    room: "room:p013",
    script: "boss:ruins:fanatic:1",
    command: "deployFanaticI",
  },
] as const;
function bossRoomEntry(d: DungeonState) {
  if (
    d.phase !== "awaitingRoom" ||
    d.roomCards?.active?.tileId !== undefined ||
    d.questDistribution?.questId !== "quest:p019" ||
    !["standard", "radiant"].includes(d.mode)
  )
    return undefined;
  return entries.find(
    (e) =>
      d.campaignLevel === e.level &&
      d.roomCards?.active?.cardId === e.room &&
      d.activeBossThreatScriptId === e.script &&
      d.faceTheThreatEmbarkPlan?.resolvedScriptId === e.script,
  );
}
export function ruinsBossRoomEntryVisible(d: DungeonState): boolean {
  return !!bossRoomEntry(d);
}
