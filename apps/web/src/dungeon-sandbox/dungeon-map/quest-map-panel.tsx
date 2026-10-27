import type { GameState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../../packages/data/src/dungeon-layout";
import { layouts } from "../dungeon-data";
import type { Fixture } from "../fixture-types";
import { DungeonQuestMapFrame } from "./dungeon-quest-map-frame";

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
                  {l.unresolvedMarkers?.length || l.review !== "confirmed" ? "（仅预览）" : ""}
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
              <option value="dark">Dark 房间与 Torch（p1、种子 1、固定房间代币）</option>
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
      <DungeonQuestMapFrame game={game} map={map} preview={Boolean(preview)} />
    </section>
  );
}
