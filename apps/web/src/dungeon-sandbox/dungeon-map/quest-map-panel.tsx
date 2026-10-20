import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { lookupQuestMapArt, lookupRoomTokenArt } from "../../card-art/resolve-exploration-art";
import { roomKindLabels } from "../labels";
import type { Fixture } from "../fixture-types";
import type { GameState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";

export function QuestMapPanel({
  game,
  formal,
  page,
  preview,
}: {
  game: GameState;
  formal: boolean;
  page: number;
  fixture: Fixture;
  preview: DungeonLayout | null;
  select: (page: number, fixture: Fixture) => void;
}) {
  const d = game.dungeon!;
  const map = preview ?? d.layout;
  const questMapArt = lookupQuestMapArt(map.id);
  return (
    <section className="panel quest-map-panel">
      <h2>{formal ? "地牢地图" : "板块标注预览"}</h2>
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
          aria-label={`QuestMap p${page} 标注`}
          className="quest-map-frame__svg"
        >
          {map.edges.map(([a, b]) => {
            const from = map.nodes.find((n) => n.id === a)!;
            const to = map.nodes.find((n) => n.id === b)!;
            return (
              <line
                key={`${a}-${b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#827d72"
                strokeWidth="0.7"
              />
            );
          })}
          {map.nodes.map((n) => {
            const room = preview ? undefined : d.rooms.find((r) => r.id === n.id);
            const tokenArt =
              room?.revealed && !room.cleared ? lookupRoomTokenArt(room.kind) : undefined;
            return (
              <g key={n.id} data-testid={`dungeon-node-${n.id}`}>
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
                <rect
                  x={n.x - 6}
                  y={n.y - 6}
                  width="12"
                  height="12"
                  rx="1"
                  fill={
                    tokenArt
                      ? "rgba(32, 37, 35, 0.35)"
                      : !preview && d.position === n.id
                        ? "#735629"
                        : "#202523"
                  }
                  stroke="#827d72"
                  strokeWidth="0.5"
                />
                <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#f5e7ce" fontSize="3.5">
                  {n.id}
                  {!preview && d.position === n.id ? " · 队伍" : ""}
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
                        ? roomKindLabels[room.kind]
                        : "未揭示"
                    : n.kind === "dot"
                      ? "灰点"
                      : n.kind === "unresolved" ||
                          map.unresolvedMarkers?.some((m) => m.nodeId === n.id)
                        ? "待确认"
                        : n.kind === "start"
                          ? "起点"
                          : "房间槽"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
