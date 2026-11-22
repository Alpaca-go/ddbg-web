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
    id: "hag",
    level: 2,
    name: "Hag II",
    roomName: "Hag",
    room: "room:weald:10",
    script: "boss:weald:hag:2",
    command: "deployHagHigher",
  },
  {
    id: "pounder",
    level: 2,
    name: "Brigand Pounder II",
    roomName: "Brigand Pounder",
    room: "room:weald:12",
    script: "boss:weald:brigandPounder:2",
    command: "deployPounderHigher",
  },
  {
    id: "shrieker",
    level: 2,
    name: "Shrieker II",
    roomName: "Shrieker",
    room: "room:weald:11",
    script: "boss:weald:shrieker:2",
    command: "deployShriekerHigher",
  },
  {
    id: "hag",
    level: 3,
    name: "Hag III",
    roomName: "Hag",
    room: "room:weald:10",
    script: "boss:weald:hag:3",
    command: "deployHagHigher",
  },
  {
    id: "pounder",
    level: 3,
    name: "Brigand Pounder III",
    roomName: "Brigand Pounder",
    room: "room:weald:12",
    script: "boss:weald:brigandPounder:3",
    command: "deployPounderHigher",
  },
  {
    id: "shrieker",
    level: 3,
    name: "Shrieker III",
    roomName: "Shrieker",
    room: "room:weald:11",
    script: "boss:weald:shrieker:3",
    command: "deployShriekerHigher",
  },
  {
    id: "shrieker",
    level: 1,
    name: "Shrieker I",
    roomName: "Shrieker",
    room: "room:weald:11",
    script: "boss:weald:shrieker:1",
    command: "deployShriekerI",
  },
  {
    id: "pounder",
    level: 1,
    name: "Brigand Pounder I",
    roomName: "Brigand Pounder",
    room: "room:weald:12",
    script: "boss:weald:brigandPounder:1",
    command: "deployPounderI",
  },
  {
    id: "hag",
    level: 1,
    name: "Hag I",
    roomName: "Hag",
    room: "room:weald:10",
    script: "boss:weald:hag:1",
    command: "deployHagI",
  },
  {
    id: "necromancer",
    level: 1,
    name: "Necromancer I",
    roomName: "Necromancer Room",
    room: "room:ruins:10",
    script: "boss:ruins:necromancer:1",
    command: "deployNecromancerI",
  },
  {
    id: "necromancer-2",
    level: 2,
    name: "Necromancer II",
    roomName: "Necromancer Room",
    room: "room:ruins:10",
    script: "boss:ruins:necromancer:2",
    command: "deployNecromancerII",
  },
  {
    id: "necromancer-3",
    level: 3,
    name: "Necromancer III",
    roomName: "Necromancer Room",
    room: "room:ruins:10",
    script: "boss:ruins:necromancer:3",
    command: "deployNecromancerIII",
  },
  {
    id: "prophet",
    level: 1,
    name: "Prophet I",
    roomName: "Prophet Room",
    room: "room:ruins:11",
    script: "boss:ruins:prophet:1",
    command: "deployProphetI",
  },
  {
    id: "prophet-2",
    level: 2,
    name: "Prophet II",
    roomName: "Prophet Room",
    room: "room:ruins:11",
    script: "boss:ruins:prophet:2",
    command: "deployProphetII",
  },
  {
    id: "prophet-3",
    level: 3,
    name: "Prophet III",
    roomName: "Prophet Room",
    room: "room:ruins:11",
    script: "boss:ruins:prophet:3",
    command: "deployProphetIII",
  },
  {
    id: "collector",
    level: 1,
    name: "Collector I",
    roomName: "Collector Room",
    room: "room:ruins:12",
    script: "boss:ruins:collector:1",
    command: "deployCollectorI",
  },
  {
    id: "collector-2",
    level: 2,
    name: "Collector II",
    roomName: "Collector Room",
    room: "room:ruins:12",
    script: "boss:ruins:collector:2",
    command: "deployCollectorII",
  },
  {
    id: "collector-3",
    level: 3,
    name: "Collector III",
    roomName: "Collector Room",
    room: "room:ruins:12",
    script: "boss:ruins:collector:3",
    command: "deployCollectorIII",
  },
  {
    id: "fanatic",
    level: 1,
    name: "Fanatic I",
    roomName: "Fanatic Room",
    room: "room:ruins:13",
    script: "boss:ruins:fanatic:1",
    command: "deployFanaticI",
  },
  {
    id: "fanatic-2",
    level: 2,
    name: "Fanatic II",
    roomName: "Fanatic Room",
    room: "room:ruins:13",
    script: "boss:ruins:fanatic:2",
    command: "deployFanaticII",
  },
  {
    id: "fanatic-3",
    level: 3,
    name: "Fanatic III",
    roomName: "Fanatic Room",
    room: "room:ruins:13",
    script: "boss:ruins:fanatic:3",
    command: "deployFanaticIII",
  },
] as const;
function bossRoomEntry(d: DungeonState) {
  if (
    d.phase !== "awaitingRoom" ||
    d.roomCards?.active?.tileId !== undefined ||
    d.questDistribution?.questId !== "quest:p019" ||
    !["standard", "radiant", "stygian"].includes(d.mode)
  )
    return undefined;
  return entries.find(
    (e) =>
      (!["hag", "pounder", "shrieker"].includes(e.id) || e.level === 1 || d.wealdHigherBosses) &&
      (e.id !== "shrieker" || d.shriekerBossBattles) &&
      (e.id !== "pounder" ||
        (d.pounderBossBattles && d.pounderDungeonThreats && d.pounderHamletThreats)) &&
      (!["hag", "pounder", "shrieker"].includes(e.id) ||
        (d.contentPacks?.includes("weald") &&
          d.bossLocationSources &&
          d.bossExpeditionRegion === "weald")) &&
      d.campaignLevel === e.level &&
      d.roomCards?.active?.cardId === e.room &&
      d.activeBossThreatScriptId === e.script &&
      d.faceTheThreatEmbarkPlan?.resolvedScriptId === e.script,
  );
}
export function ruinsBossRoomEntryVisible(d: DungeonState): boolean {
  return !!bossRoomEntry(d);
}
