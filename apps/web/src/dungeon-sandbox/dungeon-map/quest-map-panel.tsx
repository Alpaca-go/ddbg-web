import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { lookupQuestMapArt, lookupRoomTokenArt } from "../../card-art/resolve-exploration-art";
import { roomKindLabels } from "../labels";
import { layouts } from "../dungeon-data";
import type { Fixture } from "../fixture-types";
import type { GameState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";

export function QuestMapPanel({
  game,
  formal,
  page,
  fixture,
  preview,
  select,
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
    <section className="panel">
      <h2>{formal ? "地牢地图" : "板块标注预览"}</h2>
      {!formal && (
        <>
          <label>
            地图页码
            <select value={page} onChange={(e) => select(Number(e.target.value), fixture)}>
              {layouts.map((l) => (
                <option key={l.id} value={l.source.page}>
                  p{l.source.page}
                  {l.unresolvedMarkers?.length ? "（仅预览）" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            侦察测试布置
            <select value={fixture} onChange={(e) => select(page, e.target.value as Fixture)}>
              <option value="neutral">中立英雄</option>
              <option value="navigationProvisions">探索间补给（伤口 / 压力 / 状态注入）</option>
              <option value="startingProvisions">入口开局补给（标准 / Radiant）</option>
              <option value="fundraiser">Fundraiser I · 完整八枚代币</option>
              <option value="fundraiserBattle">Fundraiser I · 巢穴战斗入口（种子1885）</option>
              <option value="fundraiserRewards">
                Fundraiser I · 结算测试（1巢穴与60金币注入）
              </option>
              <option value="wipe">Wipe ‘Em Out I · 完整八枚代币（种子1）</option>
              <option value="wipeBattle">Wipe ‘Em Out I · 巢穴战斗入口（种子1885）</option>
              <option value="pressure">首次检定（hero-0 压力 9）</option>
              <option value="heartAttack">已有意志卡（hero-0 压力 9）</option>
              <option value="corridor">单走廊 → Empty（标准 p1、种子 31、无需侦察）</option>
              <option value="curio">Curio → Empty（标准 p1、种子 1237、先用 Torch）</option>
              <option value="curioRoom">
                Curio 房间入口（种子80；注入D房间代币，完整Curio牌池）
              </option>
              <option value="curioBuff">Curio Buff（标准 p1、种子 343、先用 Torch）</option>
              <option value="curioNegative">
                Heirloom Chest负面状态（标准 p1、种子46、不用Torch）
              </option>
              <option value="curioProvision">
                Curio 补给 Wild（标准 p1、种子 370、先用 Torch）
              </option>
              <option value="curioPositive">Curio 正面怪癖（标准 p1、种子 85、先用 Torch）</option>
              <option value="curioRewards">
                Curio 怪癖与补给（标准 p1、种子 317、先用 Torch）
              </option>
              <option value="curioTrinket">Curio 饰品获得（标准 p1、种子 921、先用 Torch）</option>
              <option value="curioComposite">
                Curio 复合奖励（标准 p1、种子 230、先用 Torch）
              </option>
              <option value="trap">Trap 房间（p1、种子 1、DL 3、hero-0 压力 8）</option>
              <option value="dark">Dark 房间与 Torch（p1、种子 1，固定房间代币）</option>
              <option value="roomApproved">
                Lair → Ritual Chamber（p1、种子 11、先侦察 Radiant）
              </option>
              <option value="roomBattle">
                Lair → Ritual Chamber 可战斗（p1、种子 1885、先侦察 Radiant）
              </option>
              <option value="roomDisease">Maggot 守卫战斗（种子 4，固定房间代币）</option>
              <option value="roomFountain">
                Healing Fountain（种子10，固定房间代币，完整房间/怪物池）
              </option>
              <option value="roomBeacon">
                Beacon of Light（种子1，固定房间代币，完整房间/怪物池）
              </option>
              <option value="roomAncestor">
                Tomb of Ancestor（种子12，固定房间代币，完整房间/怪物池）
              </option>
              <option value="roomAbbey">Old Abbey（种子7，固定房间代币，完整房间/怪物池）</option>
              <option value="roomSpiked">Spiked Pit（种子9，固定房间代币，完整房间/怪物池）</option>
              <option value="roomInvocation">
                Invocation Chamber（种子2，固定房间代币，完整房间/怪物池）
              </option>
              <option value="roomBlocked">
                Lair → Treasure Chamber（p1、种子35、固定房间代币、先侦察 Radiant）
              </option>
            </select>
          </label>
        </>
      )}
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
