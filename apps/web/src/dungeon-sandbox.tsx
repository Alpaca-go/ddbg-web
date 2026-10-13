import { create } from "zustand";
import {
  applyCommand,
  canLeaveDungeon,
  createDungeonSandbox,
  createTrinketPool,
  readRoomTile,
} from "@ddbg/engine";
import type { Command, GameEvent, GameState, DungeonState } from "@ddbg/engine";
import rawLayouts from "../../../packages/data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutFileSchema } from "../../../packages/data/src/dungeon-layout";
import type { DungeonLayout } from "../../../packages/data/src/dungeon-layout";
import { battleData } from "virtual:battle-data";
import { BattleView } from "./battle-view";
import distribution from "../../../packages/data/normalized/corebox/scout_ahead_distribution.json";
import rawRooms from "../../../packages/data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../packages/data/src/room";
import rawMonsterPool from "../../../packages/data/normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema } from "../../../packages/data/src/monster-pool";
import rawCurios from "../../../packages/data/normalized/corebox/curio.json";
import rawTrinkets from "../../../packages/data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../packages/data/src/normalize/schema";
import { curioFileSchema, isNegativeCurioEffect } from "../../../packages/data/src/curio";
import type { CurioEffect } from "../../../packages/data/src/curio";

function curioEffectLabel(effect: CurioEffect) {
  if (effect.type === "gold") return `金币 +${effect.amount}`;
  if (effect.type === "stress") return `压力 +${effect.amount}`;
  if (effect.type === "status")
    return `${{ bleed: "流血", blight: "腐蚀", buff: "增益", debuff: "减益" }[effect.kind]}${effect.amount ? ` ${effect.amount}` : ""}，${effect.duration} 回合`;
  if (effect.type === "drawDisease") return "获得一张疾病";
  if (effect.type === "drawQuirk")
    return `抽一张${effect.polarity === "positive" ? "正面" : "负面"}怪癖`;
  if (effect.type === "drawTrinket") return "抽一张饰品卡";
  return "掷一颗补给骰";
}

const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
const curios = curioFileSchema.parse(rawCurios).cards;
type Fixture =
  | "neutral"
  | "pressure"
  | "heartAttack"
  | "corridor"
  | "curio"
  | "curioBuff"
  | "curioProvision"
  | "curioPositive"
  | "curioRewards"
  | "curioTrinket"
  | "curioComposite"
  | "trap"
  | "dark"
  | "roomApproved"
  | "roomBattle"
  | "roomDisease"
  | "roomBlocked";
function setup(mode: DungeonState["mode"], page = 1, fixture: Fixture = "neutral") {
  const selected = layouts.find((l) => l.source.page === page)!;
  const preview = selected.unresolvedMarkers?.length ? selected : null;
  const layout = preview ? layouts[0]! : selected;
  const position =
    layout.nodes.find(
      (n) =>
        n.kind === "room" &&
        layout.edges.some(
          (e) =>
            e.includes(n.id) &&
            e.some((id) => layout.nodes.some((dot) => dot.id === id && dot.kind === "dot")),
        ),
    )?.id ??
    layout.edges
      .flat()
      .find((id) => id !== "S" && layout.edges.some((e) => e.includes("S") && e.includes(id)))!;
  const heroes = Array.from({ length: 4 }, (_, i) => ({
    id: `hero-${i}`,
    stress:
      i === 0
        ? fixture === "trap"
          ? 8
          : fixture === "pressure" || fixture === "heartAttack"
            ? 9
            : 0
        : 0,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    ...(() => {
      const stat = battleData.heroStats.find(
        (s) => s.level === 1 && s.name === ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][i],
      )!;
      return {
        level: stat.level,
        life: stat.life,
        attributesVerified: stat.attributesVerified,
        wounds: 0,
        heroStatId: stat.id,
        skillIds: battleData.skills
          .filter((s) => s.hero === stat.name && s.level === 1)
          .slice(0, 3)
          .map((s) => s.id),
      };
    })(),
    ...(i === 0 && fixture === "heartAttack"
      ? { resolveTested: true, resolveCardId: battleData.resolveCards[0]!.id }
      : {}),
  }));
  const initial = createDungeonSandbox(
    fixture === "roomDisease"
      ? 4
      : fixture === "roomBattle"
        ? 1885
        : fixture === "roomApproved"
          ? 11
          : fixture === "roomBlocked"
            ? 12
            : fixture === "curioComposite"
              ? 230
              : fixture === "curioTrinket"
                ? 921
                : fixture === "curioRewards"
                  ? 317
                  : fixture === "curioPositive"
                    ? 85
                    : fixture === "curioProvision"
                      ? 370
                      : fixture === "curioBuff"
                        ? 343
                        : fixture === "curio"
                          ? 1237
                          : fixture === "corridor"
                            ? 31
                            : 1,
    layout,
    distribution,
    mode,
    position,
    heroes,
    battleData.resolveCards,
    {
      dungeonLevel: fixture === "trap" ? 3 : 1,
      light: 5,
      provisions: [
        { id: "tool-1", face: "tool" },
        { id: "tool-2", face: "tool" },
        { id: "tool-3", face: "tool" },
        { id: "tool-4", face: "tool" },
        { id: "torch-1", face: "torch" },
        { id: "food-1", face: "food" },
      ],
    },
    curios,
    roomFileSchema.parse(rawRooms).cards,
    monsterPoolFileSchema.parse(rawMonsterPool).cards,
    {
      ...battleData,
      trinkets: createTrinketPool(
        normalizedTrinketFileSchema.parse(rawTrinkets).cards,
        fixture === "trap" ? 3 : 1,
      ),
    },
  );
  // 此布置以已清理的起始房间演示真实走廊往返，不模拟该房间的战斗或奖励。
  const startingKind = initial.dungeon!.rooms.find((r) => r.id === position)!.kind;
  const corridorSwap =
    fixture === "corridor" && startingKind !== "empty"
      ? initial.dungeon!.rooms.find((r) => r.kind === "empty" && r.id !== "D" && r.id !== position)
          ?.id
      : undefined;
  const game =
    fixture === "corridor" ||
    fixture === "curio" ||
    fixture === "curioBuff" ||
    fixture === "curioProvision" ||
    fixture === "curioPositive" ||
    fixture === "curioRewards" ||
    fixture === "curioTrinket" ||
    fixture === "curioComposite"
      ? {
          ...initial,
          dungeon: {
            ...initial.dungeon!,
            rooms: initial.dungeon!.rooms.map((r) =>
              r.id === position
                ? { ...r, ...(corridorSwap ? { kind: "empty" as const } : {}), cleared: true }
                : r.id === corridorSwap
                  ? { ...r, kind: startingKind }
                  : r,
            ),
          },
        }
      : fixture === "dark"
        ? {
            ...initial,
            dungeon: {
              ...initial.dungeon!,
              rooms: initial.dungeon!.rooms.map((r) =>
                r.id === "D"
                  ? { ...r, kind: "dark" as const }
                  : r.kind === "dark"
                    ? { ...r, kind: initial.dungeon!.rooms.find((room) => room.id === "D")!.kind }
                    : r.id === position
                      ? { ...r, cleared: true }
                      : r,
              ),
            },
          }
        : fixture === "roomDisease"
          ? {
              ...initial,
              dungeon: {
                ...initial.dungeon!,
                rooms: initial.dungeon!.rooms.map((r) =>
                  r.id === "D"
                    ? { ...r, kind: "lair" as const }
                    : r.id === "A"
                      ? { ...r, kind: "curio" as const }
                      : r,
                ),
              },
            }
          : initial;
  return {
    game,
    page,
    fixture,
    preview,
    events: [],
    commands: [],
  };
}

const useDungeonStore = create<{
  game: GameState;
  page: number;
  fixture: Fixture;
  preview: DungeonLayout | null;
  events: readonly GameEvent[];
  commands: readonly Command[];
  dispatch: (command: Command) => void;
  reset: (mode: DungeonState["mode"]) => void;
  select: (page: number, fixture: Fixture) => void;
}>((set) => ({
  // 当前房间为导航就绪的测试注入点；没有通过走廊，也没有获得奖励。
  ...setup("standard"),
  dispatch: (command) =>
    set((s) => {
      const result = applyCommand(s.game, command);
      return { game: result.state, events: result.events, commands: [...s.commands, command] };
    }),
  reset: (mode) => set((s) => setup(mode, s.page, s.fixture)),
  select: (page, fixture) => set((s) => setup(s.game.dungeon!.mode, page, fixture)),
}));
const labels = {
  empty: "空房",
  dark: "黑暗",
  curio: "奇物",
  lair: "巢穴",
  trap: "陷阱",
  treasure: "宝藏",
  objective: "目标",
};

export function DungeonSandbox() {
  const { game, events, commands, dispatch, reset, select, page, fixture, preview } =
    useDungeonStore();
  const d = game.dungeon!;
  if (game.battle)
    return (
      <BattleView
        game={game}
        dispatch={dispatch}
        events={events}
        commands={commands}
        layout="dungeon"
        notice={events.map((e) => e.message).join("；")}
      />
    );
  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const map = preview ?? d.layout;
  const shownCurio = d.curio?.active ?? d.curio?.last;
  const card = d.curio?.cards.find((c) => c.id === shownCurio?.cardId);
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 3</p>
          <h1>地牢布局与侦察</h1>
          <p className="muted">
            QuestMap p{page} 标注待批准 · Scout Ahead · 固定种子 {game.seed} · 光照{" "}
            {d.explorationSetup?.light ?? "待配置"}、DL {d.explorationSetup!.dungeonLevel}
          </p>
          <p>
            {preview
              ? "16 槽地图仅预览，未解释标记保留，未开启 Boss 规则。"
              : "测试注入：导航就绪英雄与六个补给；从选路开始，逐骰结算后进入目标节点。"}
          </p>
          <a href="/">返回战斗沙盒</a>
        </div>
      </header>
      <section className="panel">
        <h2>板块标注预览</h2>
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
            <option value="pressure">首次检定（hero-0 压力 9）</option>
            <option value="heartAttack">已有意志卡（hero-0 压力 9）</option>
            <option value="corridor">单走廊 → Empty（标准 p1、种子 31、无需侦察）</option>
            <option value="curio">Curio → Empty（标准 p1、种子 1237、先用 Torch）</option>
            <option value="curioBuff">Curio Buff（标准 p1、种子 343、先用 Torch）</option>
            <option value="curioProvision">Curio 补给 Wild（标准 p1、种子 370、先用 Torch）</option>
            <option value="curioPositive">Curio 正面怪癖（标准 p1、种子 85、先用 Torch）</option>
            <option value="curioRewards">Curio 怪癖与补给（标准 p1、种子 317、先用 Torch）</option>
            <option value="curioTrinket">Curio 饰品获得（标准 p1、种子 921、先用 Torch）</option>
            <option value="curioComposite">Curio 复合奖励（标准 p1、种子 230、先用 Torch）</option>
            <option value="trap">Trap 房间（p1、种子 1、DL 3、hero-0 压力 8）</option>
            <option value="dark">Dark 房间与 Torch（p1、种子 1，固定房间代币）</option>
            <option value="roomApproved">
              Lair → Ritual Chamber（p1、种子 11、先侦察 Radiant）
            </option>
            <option value="roomBattle">
              Lair → Ritual Chamber 可战斗（p1、种子 1885、先侦察 Radiant）
            </option>
            <option value="roomDisease">Maggot 守卫战斗（种子 4，固定房间代币）</option>
            <option value="roomBlocked">
              Lair → Tomb of Ancestor（p1、种子 12、先侦察 Radiant）
            </option>
          </select>
        </label>
        <svg
          viewBox="0 0 100 92"
          role="img"
          aria-label={`QuestMap p${page} 标注`}
          style={{ width: "100%", maxWidth: 540 }}
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
            return (
              <g key={n.id} data-testid={`dungeon-node-${n.id}`}>
                <rect
                  x={n.x - 6}
                  y={n.y - 6}
                  width="12"
                  height="12"
                  rx="1"
                  fill={!preview && d.position === n.id ? "#735629" : "#202523"}
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
                        ? labels[room.kind]
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
      </section>
      {!preview && (
        <section className="panel">
          <h2>侦察流程</h2>
          {d.mustLeaveRoomId === d.position && (
            <p>第四轮撤退：本房间未清理，须先离开才能再次进入（R25）。</p>
          )}
          <p data-testid="dungeon-pressure">
            {d.heroes
              .map(
                (h) =>
                  `${h.id} 压力 ${h.stress}${h.dead ? (h.wounds === h.life ? "（死门死亡）" : "（心脏病死亡）") : h.resolveCardId ? ` · 意志卡 ${d.resolveCards.find((c) => c.id === h.resolveCardId)?.name}` : ""} · 伤口 ${h.wounds}/${h.life}`,
              )
              .join(" · ")}
          </p>
          <p data-testid="dungeon-bonus">
            下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
          </p>
          <p data-testid="dungeon-conditions">
            {d.heroes
              .filter((h) => h.diseaseId || h.quirkIds?.length)
              .map(
                (h) =>
                  `${h.id} · 疾病：${d.conditions?.diseases.find((c) => c.id === h.diseaseId)?.name ?? "无"} · 怪癖：${h.quirkIds?.map((id) => d.conditions?.quirks.find((q) => q.id === id)?.name ?? id).join("、") || "无"}`,
              )
              .join("；") || "疾病 / 怪癖：无"}
          </p>
          <p data-testid="dungeon-trinkets">
            携带饰品：
            {d.trinkets?.held
              .map(
                (h) =>
                  `${h.heroId} · ${d.trinkets!.cards.find((c) => c.id === h.cardId)!.name}（${h.face === "upright" ? "正面" : "反面"}）`,
              )
              .join("；") || "无"}
          </p>
          <button onClick={() => reset("standard")}>重置标准模式</button>{" "}
          <button onClick={() => reset("radiant")}>重置 Radiant</button>{" "}
          {d.phase === "blockedPressure" && (
            <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>
              恢复意志检定
            </button>
          )}
          {d.phase === "awaitingRoom" &&
            !d.pending &&
            (currentRoom?.kind === "lair" || currentRoom?.kind === "treasure") &&
            !d.roomCards?.active && (
              <button onClick={() => dispatch({ type: "prepareDungeonBattle" })}>
                抽房间牌并匹配战斗板块
              </button>
            )}
          {d.roomCards?.active &&
            (() => {
              const active = d.roomCards.active;
              const roomCard = d.roomCards.cards.find((c) => c.id === active.cardId)!;
              const selectedTile = readRoomTile(roomCard, active.tileId);
              return (
                <div className="panel" data-testid="dungeon-room-card">
                  <h3>
                    {roomCard.name} · 遗迹 {roomCard.number}
                  </h3>
                  <p>
                    完整遗迹房间牌池 9 张 · 余牌 {d.roomCards.deck!.length} · 已抽 1 张 · 印刷页{" "}
                    {roomCard.source.page}
                  </p>
                  <p>地点与 Boss 分堆；效果栏保留原文和图标 ID，尚未执行。</p>
                  <details>
                    <summary>查看卡面转录（含未解释图标）</summary>
                    {roomCard.printedLines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </details>
                  {active.tileId && selectedTile.status === "matched" && (
                    <p>
                      已匹配 {selectedTile.tile.name}（部署已核实），
                      {selectedTile.tile.areas.length} 个区域，英雄部署{" "}
                      {[...new Set(Object.values(selectedTile.deployment.heroes))].join(" / ")}
                      ，怪物部署{" "}
                      {[...new Set(Object.values(selectedTile.deployment.monsters))].join(" / ")}。
                    </p>
                  )}
                  <p role="status">{active.blockedReason}</p>
                  {active.tileId && !d.monsterPool?.active && (
                    <button onClick={() => dispatch({ type: "prepareDungeonMonsters" })}>
                      从完整 42 张怪物池抽牌并记录部署
                    </button>
                  )}
                  {d.monsterPool?.active && (
                    <div data-testid="dungeon-monsters">
                      <button onClick={() => dispatch({ type: "startDungeonBattle" })}>
                        进入房间战斗
                      </button>
                      <p>
                        Common + Ruins I · 完整牌池 42 张 · 余牌 {d.monsterPool.remaining!.length} ·
                        部署 {d.monsterPool.active.monsters.length} · 弃牌{" "}
                        {d.monsterPool.discarded.length}
                      </p>
                      {d.monsterPool.active.monsters.map((m) => (
                        <p key={m.instanceId}>
                          {d.monsterPool!.cards.find((c) => c.combatCardId === m.cardId)!.name} ·{" "}
                          {m.instanceId} ·{" "}
                          {
                            {
                              aggressive: "进攻",
                              defensive: "防御",
                              ranged: "远程",
                              support: "支援",
                            }[m.stance]
                          }{" "}
                          → {m.areaId} · 占 {m.stanceSlots} 格
                        </p>
                      ))}
                      <p>原牌与余牌已保留，等待正式战斗接线。</p>
                    </div>
                  )}
                </div>
              );
            })()}
          {d.phase === "awaitingRoom" &&
            !d.pending &&
            ["trap", "dark"].includes(currentRoom?.kind ?? "") && (
              <button onClick={() => dispatch({ type: "resolveDungeonRoom" })}>
                结算 {currentRoom?.kind === "dark" ? "Dark" : "Trap"} 房间
              </button>
            )}
          {d.roomResolution?.roomId === d.position && (
            <p data-testid="dungeon-room-resolution">
              {d.roomResolution.kind === "dark"
                ? "Dark 光照降低已支付"
                : `Trap 已分配：${d.roomResolution.resolvedHeroIds.join("、") || "无"}`}
              {d.roomResolution.completed ? "；全员完成，保留代币" : "；仍需完成房间结算"}
            </p>
          )}
          <button
            disabled={!!d.pending || d.phase !== "ready" || d.mustLeaveRoomId === d.position}
            onClick={() => dispatch({ type: "scoutDungeon" })}
          >
            侦察
          </button>{" "}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "beginDungeonExploration" })}
          >
            选择下一段探索
          </button>{" "}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "beginDungeonBacktrack" })}
          >
            原路返回
          </button>{" "}
          <button
            disabled={!canLeaveDungeon(game)}
            onClick={() => dispatch({ type: "leaveDungeon" })}
          >
            离开地牢
          </button>
          <p className="muted">普通走廊返回不掷骰，全员压力 +1；灰点与起点返回尚未接线。</p>
          {d.phase === "awaitingHazards" && !d.exploration?.rolls && (
            <button
              disabled={!!d.pending}
              onClick={() => dispatch({ type: "rollDungeonExploration" })}
            >
              掷探索骰并开始结算
            </button>
          )}
          <p data-testid="dungeon-provisions">
            剩余补给：
            {d.explorationSetup!.provisions.map((p) => `${p.id} ${p.face}`).join(" · ") || "无"}
          </p>
          <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
          {d.phase === "exited" && (
            <div data-testid="dungeon-quest-summary">
              {d.questSummary ? (
                <p>
                  {d.questSummary.name} · 清理 {d.questSummary.clearedRoomIds.length} / 6 间 ·
                  每名英雄待发 {d.questSummary.xpPerHero} XP · 驿站待发{" "}
                  {d.questSummary.stagecoachXp} XP · 回村发放尚未接线
                </p>
              ) : (
                <button onClick={() => dispatch({ type: "summarizeDungeonQuest" })}>
                  生成任务结算摘要
                </button>
              )}
            </div>
          )}
          {d.explorationSetup!.light < 5 &&
            d
              .explorationSetup!.provisions.filter((p) => p.face === "torch")
              .map((p) => (
                <button
                  key={p.id}
                  disabled={d.phase !== "ready" || !!d.pending}
                  onClick={() =>
                    dispatch({
                      type: "useProvision",
                      provisionId: p.id,
                      targetId: d.heroes.find((h) => !h.dead)!.id,
                      effect: "raiseLight",
                    })
                  }
                >
                  使用 Torch（{p.id}）：光照 +1
                </button>
              ))}
          {card && shownCurio && (
            <div className="panel" data-testid="dungeon-curio">
              <h3>
                Curio · {card.name} · p{card.source.page}
              </h3>
              <p>{card.text}</p>
              <p>
                {shownCurio.heroId} · 抽卡前{" "}
                {shownCurio.protected ? "已使用 Torch" : "未使用 Torch"} · 牌池剩余{" "}
                {d.curio!.deck?.length ?? 24} · 弃牌 {d.curio!.discard.length}
              </p>
              <ul>
                {card.rows.map((r, i) => (
                  <li key={i}>
                    {r.effect
                      ? `${curioEffectLabel(r.effect)}${shownCurio.protected && isNegativeCurioEffect(r.effect) ? " · Torch 保护" : ""}`
                      : `${r.printed} · 待确认（${r.reason}）`}
                  </li>
                ))}
              </ul>
              {d.phase === "awaitingCurio" && (
                <button
                  disabled={!!d.pending}
                  onClick={() => dispatch({ type: "resolveDungeonCurio" })}
                >
                  结算当前 Curio
                </button>
              )}
              {d.curio!.active?.blockedReason && (
                <p role="status">{d.curio!.active.blockedReason}</p>
              )}
            </div>
          )}
          {d.exploration?.rolls && (
            <p data-testid="dungeon-rolls">
              {d.exploration.rolls
                .map((r) => `${r.id} ${r.face}${r.resolved ? "（已结算）" : "（待结算）"}`)
                .join(" · ")}
            </p>
          )}
          {d.pending && (
            <div>
              <p>{d.pending.prompt}</p>
              {d.pending.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() =>
                    dispatch({ type: "resolveChoice", choiceId: d.pending!.id, optionId: o.id })
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <p data-testid="dungeon-checkpoint">
            {d.phase === "exited"
              ? `已从 ${d.position} 离开地牢；金币与英雄状态已保留，等待任务 XP / 回村接口`
              : d.phase === "ready" && d.mustLeaveRoomId === d.position
                ? `已撤退到 ${d.position} 地图节点；房间未清理，必须离开`
                : d.phase === "awaitingCurio"
                  ? "Curio 待结算；队伍尚未移动，不能补用 Torch 或重抽"
                  : d.phase === "awaitingReplacement"
                    ? `英雄死亡：等待驿站替换接口，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`
                    : d.phase === "blockedPressure"
                      ? `压力已支付：意志卡数据待核实，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`
                      : d.phase === "awaitingRoom"
                        ? `进入 ${d.position}：等待${d.roomCards?.active ? "守卫战斗准备完成；原牌已记录，房间未清理" : currentRoom?.kind === "trap" ? " Trap 分配，保留代币" : currentRoom?.kind === "dark" ? " Dark 降光，保留代币" : "非 Empty 房间效果"}`
                        : d.phase === "ready" && (d.exploration || (d.visited?.length ?? 0) > 1)
                          ? `已到达 ${d.position}；${currentRoom?.cleared ? (currentRoom.kind === "empty" ? "Empty 已清理，移除房间代币" : "已清理，移除房间代币") : currentRoom?.kind === "trap" ? "Trap 已结算，保留代币" : currentRoom?.kind === "dark" ? "Dark 已结算，保留代币" : "灰点必须停留"}`
                          : d.exploration
                            ? `${d.exploration.from} → ${d.exploration.to} · 每人 ${d.exploration.dicePerHero} 骰 · 等待危险结算，队伍尚未移动`
                            : "等待侦察 / 路线选择"}
          </p>
          <p data-testid="dungeon-events">
            {events
              .map((e) =>
                e.type === "resolveTested"
                  ? `${e.entityId}：d10 ${e.roll}，${d.resolveCards.find((c) => c.id === e.cardId)?.name}，压力归零`
                  : e.message,
              )
              .join("；")}
          </p>
          <p className="muted">
            命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 探索按当前光照结算
          </p>
        </section>
      )}
    </main>
  );
}
