import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { lookupQuestMapArt, lookupRoomTokenArt } from "../../card-art/resolve-exploration-art";
import { resolveQuestMapEdgeCorridor } from "@ddbg/engine";
import { roomKindLabels } from "../labels";
import type { GameState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";

export function DungeonQuestMapFrame({
  game,
  map,
  preview,
  onSelectRoomNode,
  selectedRoomNodeId,
}: {
  readonly game: GameState;
  readonly map: DungeonLayout;
  readonly preview: boolean;
  readonly onSelectRoomNode?: (roomNodeId: string) => void;
  readonly selectedRoomNodeId?: string | null;
}) {
  const d = game.dungeon!;
  const questMapArt = lookupQuestMapArt(map.id);

  return (
    <div className="quest-map-frame" data-testid="quest-map-frame">
      {questMapArt && (
        <ExplorationArtImage
          entry={questMapArt}
          alt={`QuestMap FRONT p${questMapArt.page}`}
          className="quest-map-frame__art"
          testId={`quest-map-art-p${questMapArt.page}`}
        />
      )}
      <svg
        viewBox="0 0 100 92"
        role="img"
        aria-label={`QuestMap 标注`}
        className="quest-map-frame__svg"
      >
        {map.edges.map(([a, b]) => {
          const from = map.nodes.find((n) => n.id === a)!;
          const to = map.nodes.find((n) => n.id === b)!;
          const corridorBinding = preview ? undefined : resolveQuestMapEdgeCorridor(map.id, a, b);
          return (
            <line
              key={`${a}-${b}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#827d72"
              strokeWidth="0.7"
              data-corridor-binding={corridorBinding?.status}
              data-corridor-tile-id={corridorBinding?.corridorTileId ?? undefined}
            />
          );
        })}
        {map.nodes.map((n) => {
          const room = preview ? undefined : d.rooms.find((r) => r.id === n.id);
          const tokenArt =
            room?.revealed && !room.cleared ? lookupRoomTokenArt(room.kind) : undefined;
          const isPartyHere = !preview && d.position === n.id;
          const selectable = Boolean(
            onSelectRoomNode && room?.revealed && n.kind !== "dot" && n.kind !== "start",
          );
          return (
            <g
              key={n.id}
              data-testid={`dungeon-node-${n.id}`}
              className={[
                selectable ? "dungeon-node--pick" : "",
                selectedRoomNodeId === n.id ? "dungeon-node--selected" : "",
              ].join(" ")}
              onClick={
                selectable
                  ? () => {
                      onSelectRoomNode?.(n.id);
                    }
                  : undefined
              }
              onKeyDown={
                selectable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectRoomNode?.(n.id);
                      }
                    }
                  : undefined
              }
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
            >
              {tokenArt && (
                <foreignObject x={n.x - 5} y={n.y - 5} width="10" height="10">
                  <ExplorationArtImage
                    entry={tokenArt}
                    alt={roomKindLabels[room!.kind]}
                    className="dungeon-node-token"
                    testId={`dungeon-token-${n.id}`}
                  />
                </foreignObject>
              )}
              {!tokenArt && room && !room.revealed && (
                <rect
                  x={n.x - 4.5}
                  y={n.y - 4.5}
                  width="9"
                  height="9"
                  rx="1"
                  className="dungeon-node-token-back"
                  data-testid={`dungeon-token-back-${n.id}`}
                />
              )}
              <rect
                x={n.x - 6}
                y={n.y - 6}
                width="12"
                height="12"
                rx="1"
                fill={tokenArt ? "rgba(32, 37, 35, 0.35)" : isPartyHere ? "#735629" : "#202523"}
                stroke={selectedRoomNodeId === n.id ? "#c9a227" : "#827d72"}
                strokeWidth={selectedRoomNodeId === n.id ? "0.9" : "0.5"}
              />
              {isPartyHere && (
                <circle
                  cx={n.x}
                  cy={n.y - 8}
                  r="2.2"
                  className="dungeon-party-marker"
                  data-testid="tabletop-party-token"
                />
              )}
              <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#f5e7ce" fontSize="3.5">
                {n.id}
                {isPartyHere ? " · 队伍" : ""}
              </text>
              <text
                x={n.x}
                y={n.y + 3.5}
                textAnchor="middle"
                fill="#f5e7ce"
                fontSize={room?.cleared ? 1.7 : 3}
              >
                {room
                  ? room.cleared
                    ? "已清理 · 无代币"
                    : room.revealed
                      ? d.darkest && room.kind === "empty"
                        ? "挖掘点"
                        : roomKindLabels[room.kind]
                      : "未揭示"
                  : n.kind === "dot"
                    ? "灰点"
                    : n.kind === "unresolved" ||
                        map.unresolvedMarkers?.some((m) => m.nodeId === n.id)
                      ? "待确认"
                      : n.kind === "start"
                        ? "起点"
                        : n.slotKind === "boss"
                          ? "Boss 位"
                          : n.slotKind
                            ? roomKindLabels[n.slotKind]
                            : "房间槽"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
