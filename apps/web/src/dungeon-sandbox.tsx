import { create } from "zustand";
import { applyCommand, createDungeonSandbox } from "@ddbg/engine";
import type { Command, GameEvent, GameState, DungeonState } from "@ddbg/engine";
import rawLayouts from "../../../packages/data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutFileSchema } from "../../../packages/data/src/dungeon-layout";
import type { DungeonLayout } from "../../../packages/data/src/dungeon-layout";
import { battleData } from "virtual:battle-data";
import distribution from "../../../packages/data/normalized/corebox/scout_ahead_distribution.json";

const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
type Fixture = "neutral" | "pressure" | "heartAttack";
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
    stress: i === 0 && fixture !== "neutral" ? 9 : 0,
    ...(i === 0 && fixture === "heartAttack"
      ? { resolveTested: true, resolveCardId: battleData.resolveCards[0]!.id }
      : {}),
  }));
  return {
    game: createDungeonSandbox(
      1,
      layout,
      distribution,
      mode,
      position,
      heroes,
      battleData.resolveCards,
    ),
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
  const map = preview ?? d.layout;
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 3</p>
          <h1>地牢布局与侦察</h1>
          <p className="muted">
            QuestMap p{page} 标注待批准 · Scout Ahead · 固定种子 1 · 中立英雄、光照 5
          </p>
          <p>
            {preview
              ? "16 槽地图仅预览，未解释标记保留，未开启 Boss 规则。"
              : `测试注入：房间 ${d.position} 导航就绪。未模拟进入房间的探索、效果或清理。`}
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
                <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#f5e7ce" fontSize="3">
                  {room
                    ? room.revealed
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
          <p data-testid="dungeon-pressure">
            {d.heroes
              .map(
                (h) =>
                  `${h.id} 压力 ${h.stress}${h.dead ? "（心脏病死亡）" : h.resolveCardId ? ` · 意志卡 ${d.resolveCards.find((c) => c.id === h.resolveCardId)?.name}` : ""}`,
              )
              .join(" · ")}
          </p>
          <p data-testid="dungeon-bonus">
            下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
          </p>
          <button onClick={() => reset("standard")}>重置标准模式</button>{" "}
          <button onClick={() => reset("radiant")}>重置 Radiant</button>{" "}
          {d.phase === "blockedPressure" && (
            <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>
              恢复意志检定
            </button>
          )}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "scoutDungeon" })}
          >
            侦察
          </button>{" "}
          <button
            disabled={!!d.pending || d.phase !== "ready"}
            onClick={() => dispatch({ type: "beginDungeonExploration" })}
          >
            选择下一段探索
          </button>
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
            {d.exploration
              ? `${d.exploration.from} → ${d.exploration.to} · 每人 ${d.exploration.dicePerHero} 骰 · 等待危险结算，队伍尚未移动`
              : d.phase === "blockedPressure"
                ? "压力已支付：意志卡数据待核实"
                : d.phase === "awaitingReplacement"
                  ? "心脏病已记录：等待驿站替换接口"
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
            命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 光照表 / 陷阱缩放待 Kyries 确认
          </p>
        </section>
      )}
    </main>
  );
}
