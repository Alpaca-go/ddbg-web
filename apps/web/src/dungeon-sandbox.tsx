import { create } from "zustand";
import { applyCommand, createDungeonSandbox } from "@ddbg/engine";
import type { Command, GameEvent, GameState, DungeonState } from "@ddbg/engine";
import layout from "../../../packages/data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../../packages/data/normalized/corebox/scout_ahead_distribution.json";

const useDungeonStore = create<{
  game: GameState;
  events: readonly GameEvent[];
  commands: readonly Command[];
  dispatch: (command: Command) => void;
  reset: (mode: DungeonState["mode"]) => void;
}>((set) => ({
  // G 是房间结算后的测试注入点；没有通过走廊，也没有获得奖励。
  game: createDungeonSandbox(1, layout, distribution, "standard", "G"),
  events: [],
  commands: [],
  dispatch: (command) =>
    set((s) => {
      const result = applyCommand(s.game, command);
      return { game: result.state, events: result.events, commands: [...s.commands, command] };
    }),
  reset: (mode) =>
    set({
      game: createDungeonSandbox(1, layout, distribution, mode, "G"),
      events: [],
      commands: [],
    }),
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
  const { game, events, commands, dispatch, reset } = useDungeonStore();
  const d = game.dungeon!;
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 3</p>
          <h1>地牢布局与侦察</h1>
          <p className="muted">
            QuestMap p1 标注待批准 · Scout Ahead · 固定种子 1 · 中立英雄、光照 5
          </p>
          <p>测试注入：房间 G 已结算，队伍准备侦察。未模拟进入 G 的探索或房间效果。</p>
          <a href="/">返回战斗沙盒</a>
        </div>
      </header>
      <section className="panel">
        <h2>板块标注预览</h2>
        <svg
          viewBox="0 0 100 92"
          role="img"
          aria-label="QuestMap 第一页标注"
          style={{ width: "100%", maxWidth: 540 }}
        >
          {d.layout.edges.map(([a, b]) => {
            const from = d.layout.nodes.find((n) => n.id === a)!;
            const to = d.layout.nodes.find((n) => n.id === b)!;
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
          {d.layout.nodes.map((n) => {
            const room = d.rooms.find((r) => r.id === n.id);
            return (
              <g key={n.id} data-testid={`dungeon-node-${n.id}`}>
                <rect
                  x={n.x - 9}
                  y={n.y - 6}
                  width="18"
                  height="12"
                  rx="1"
                  fill={d.position === n.id ? "#735629" : "#202523"}
                  stroke="#827d72"
                  strokeWidth="0.5"
                />
                <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#f5e7ce" fontSize="3.5">
                  {n.id}
                  {d.position === n.id ? " · 队伍" : ""}
                </text>
                <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#f5e7ce" fontSize="3">
                  {room ? (room.revealed ? labels[room.kind] : "未揭示") : "起点"}
                </text>
              </g>
            );
          })}
        </svg>
      </section>
      <section className="panel">
        <h2>侦察流程</h2>
        <p data-testid="dungeon-pressure">
          {d.heroes.map((h) => `${h.id} 压力 ${h.stress}`).join(" · ")}
        </p>
        <p data-testid="dungeon-bonus">
          下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
        </p>
        <button onClick={() => reset("standard")}>重置标准模式</button>{" "}
        <button onClick={() => reset("radiant")}>重置 Radiant</button>{" "}
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
              ? "压力 10：等待探索压力流程接线"
              : "等待侦察 / 路线选择"}
        </p>
        <p>{events.map((e) => e.message).join("；")}</p>
        <p className="muted">
          命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 光照表 / 陷阱缩放待 Kyries 确认
        </p>
      </section>
    </main>
  );
}
