import { useMemo, useState } from "react";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import {
  cachedPrintExplorationUrl,
  lookupRoomCardArt,
  lookupRoomTokenArt,
} from "../../card-art/resolve-exploration-art";
import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { TabletopRasterImage } from "../../tabletop/tabletop-raster-image";
import { useTabletopFormalUi } from "../../tabletop/tabletop-formal-ui-context";
import { DungeonQuestMapFrame } from "../dungeon-map/dungeon-quest-map-frame";
import { roomKindLabels } from "../labels";
import { ScoutingPanel } from "../expedition/scouting-panel";
import type { DungeonViewProps } from "../view-props";
import type { PendingChoice } from "@ddbg/engine";

export function FormalDungeonExplorationView({
  game,
  dispatch,
  events,
  commands,
  reset,
  pendingChoice,
}: DungeonViewProps & {
  readonly reset: (mode: import("@ddbg/engine").DungeonState["mode"]) => void;
  readonly pendingChoice: PendingChoice | null | undefined;
}) {
  const formalUi = useTabletopFormalUi();
  const d = game.dungeon!;
  const quest = readBasicQuest(d.questDistribution);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const activeRoomCardId = d.roomCards?.active?.cardId;
  const roomArt = activeRoomCardId ? lookupRoomCardArt(activeRoomCardId) : undefined;
  const roomSrc = roomArt ? cachedPrintExplorationUrl(roomArt) : undefined;
  const positionToken =
    currentRoom && currentRoom.revealed && !currentRoom.cleared
      ? lookupRoomTokenArt(currentRoom.kind)
      : undefined;

  const roomPickLabel = useMemo(() => {
    if (activeRoomCardId) return "当前房间卡";
    if (currentRoom?.revealed) return roomKindLabels[currentRoom.kind];
    return "房间代币";
  }, [activeRoomCardId, currentRoom]);

  const onSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    formalUi?.selectRoomNode(nodeId);
    if (activeRoomCardId && nodeId === d.position) {
      formalUi?.selectRoomCard(activeRoomCardId);
    }
  };

  const showQuestMap =
    !d.hamlet && !d.hamletReturn && d.phase !== "exited" && d.phase !== "awaitingProvisions";

  return (
    <div
      className={["tt-formal-exploration", showQuestMap ? "" : "tt-formal-exploration--hub"]
        .filter(Boolean)
        .join(" ")}
      data-testid={showQuestMap ? "formal-dungeon-exploration" : "formal-dungeon-phase-center"}
    >
      {showQuestMap && (
        <div className="tt-formal-exploration__map-stage" aria-label="地牢地图与当前房间">
          <div className="tt-formal-exploration__map-slab tabletop-board-slab">
            <DungeonQuestMapFrame
              game={game}
              map={d.layout}
              preview={false}
              selectedRoomNodeId={selectedNodeId}
              onSelectRoomNode={onSelectNode}
            />
            <button
              type="button"
              className="tt-formal-exploration__room-pick"
              data-testid="tabletop-current-room-card"
              onClick={() => {
                if (activeRoomCardId) formalUi?.selectRoomCard(activeRoomCardId);
              }}
            >
              {activeRoomCardId && roomSrc ? (
                <TabletopRasterImage
                  src={roomSrc}
                  label={roomArt?.name ?? activeRoomCardId}
                  assetType="room"
                  className="tt-formal-exploration__room-img"
                />
              ) : positionToken ? (
                <ExplorationArtImage
                  entry={positionToken}
                  alt={currentRoom ? roomKindLabels[currentRoom.kind] : "房间代币"}
                  className="tt-formal-exploration__room-token"
                  testId="tabletop-position-room-token"
                />
              ) : (
                <span
                  className="tt-formal-exploration__room-back"
                  data-testid="tabletop-room-token-back"
                >
                  {currentRoom?.revealed ? roomKindLabels[currentRoom.kind] : "背面"}
                </span>
              )}
              <span className="tt-formal-exploration__room-label">{roomPickLabel}</span>
            </button>
          </div>
          <p className="tt-formal-exploration__location muted">
            {quest?.name ?? "地牢探索"} · 队伍位于 {d.position}
          </p>
        </div>
      )}

      <section
        className="tt-formal-exploration__actions"
        aria-label="探索行动"
        data-testid="formal-dungeon-actions"
      >
        <ScoutingPanel
          game={game}
          dispatch={dispatch}
          events={events}
          commands={commands}
          formal
          reset={reset}
          pendingChoice={pendingChoice}
          layout="tabletop"
        />
      </section>
    </div>
  );
}
