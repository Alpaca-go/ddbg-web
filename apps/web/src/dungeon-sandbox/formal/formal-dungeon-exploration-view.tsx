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
import { questObjectiveProgressLine } from "./quest-objective-line";
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
  const objectiveLine = useMemo(() => questObjectiveProgressLine(game), [game]);

  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const activeRoomCardId = d.roomCards?.active?.cardId;
  const roomArt = activeRoomCardId ? lookupRoomCardArt(activeRoomCardId) : undefined;
  const roomSrc = roomArt ? cachedPrintExplorationUrl(roomArt) : undefined;
  const positionToken =
    currentRoom && currentRoom.revealed && !currentRoom.cleared
      ? lookupRoomTokenArt(currentRoom.kind)
      : undefined;

  const onSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    formalUi?.selectRoomNode(nodeId);
    if (activeRoomCardId && nodeId === d.position) {
      formalUi?.selectRoomCard(activeRoomCardId);
    }
  };

  return (
    <div className="tt-formal-exploration" data-testid="formal-dungeon-exploration">
      <header className="tt-formal-exploration__head">
        <h1 className="tt-formal-exploration__title">{quest?.name ?? "地牢探索"}</h1>
        <p className="tt-formal-exploration__objective" data-testid="dungeon-quest-objective">
          {objectiveLine}
        </p>
      </header>

      <div className="tt-formal-exploration__map-slab tabletop-board-slab">
        <DungeonQuestMapFrame
          game={game}
          map={d.layout}
          preview={false}
          selectedRoomNodeId={selectedNodeId}
          onSelectRoomNode={onSelectNode}
        />
      </div>

      <div className="tt-formal-exploration__room-row">
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
              {currentRoom?.revealed ? roomKindLabels[currentRoom.kind] : "房间代币背面"}
            </span>
          )}
          <span className="tt-formal-exploration__room-label">
            {activeRoomCardId
              ? "当前房间卡（翻开）"
              : currentRoom?.revealed
                ? "房间代币（翻开）"
                : "房间代币（背面）"}
          </span>
        </button>
      </div>

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
