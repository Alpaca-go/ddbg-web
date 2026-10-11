import { dungeonLayoutSchema, roomDistributionSchema } from "../../data/src/dungeon-layout";
import type { DungeonLayout, RoomDistribution } from "../../data/src/dungeon-layout";
import type { ApplyResult, GameState, PendingChoice } from "./command";
import { createRng } from "./rng";
import type { ResolveCard } from "./pressure";
import { resolveDungeonPressure } from "./dungeon-pressure";

export type DungeonState = {
  readonly layout: DungeonLayout;
  readonly mode: "standard" | "radiant";
  readonly cursor: number;
  readonly position: string;
  readonly heroes: readonly {
    readonly id: string;
    readonly stress: number;
    readonly resolveTested?: boolean;
    readonly resolveCardId?: string;
    readonly dead?: boolean;
  }[];
  readonly resolveCards: readonly ResolveCard[];
  readonly resolveDecks: Partial<Readonly<Record<ResolveCard["role"], readonly string[]>>>;
  readonly rooms: readonly {
    readonly id: string;
    readonly kind: RoomDistribution["counts"][number]["kind"];
    readonly revealed: boolean;
  }[];
  readonly scoutBonus: boolean;
  readonly phase: "ready" | "awaitingHazards" | "blockedPressure" | "awaitingReplacement";
  readonly pending: PendingChoice | null;
  readonly decision: number;
  readonly exploration: {
    readonly from: string;
    readonly to: string;
    readonly dicePerHero: number;
  } | null;
};
export type DungeonCommand =
  | { readonly type: "scoutDungeon" }
  | { readonly type: "beginDungeonExploration" }
  | { readonly type: "resolveDungeonPressure" };

/** 固定地图/任务首切片沙盒。当前位置可注入，以测试房间结算后的侦察接口；不是战役布置。 */
export function createDungeonSandbox(
  seed: number,
  layoutInput: unknown,
  distributionInput: unknown,
  mode: DungeonState["mode"] = "standard",
  position = "S",
  heroes: DungeonState["heroes"] = [
    { id: "hero-0", stress: 0 },
    { id: "hero-1", stress: 0 },
    { id: "hero-2", stress: 0 },
    { id: "hero-3", stress: 0 },
  ],
  resolveCards: readonly ResolveCard[] = [],
): GameState {
  const layout = dungeonLayoutSchema.parse(layoutInput);
  const distribution = roomDistributionSchema.parse(distributionInput);
  const slots = layout.nodes.filter((n) => n.kind === "room");
  if (layout.unresolvedMarkers?.length || layout.nodes.some((n) => n.kind === "unresolved"))
    throw new Error("地图含未解释标记，只能预览（R-048）");
  const tokens = distribution.counts.flatMap((c) => Array.from({ length: c.count }, () => c.kind));
  if (tokens.length !== slots.length) throw new Error("房间槽与任务代币总数不一致（R-046）");
  if (mode !== "standard" && mode !== "radiant") throw new Error("本切片不开放 Stygian");
  if (!layout.nodes.some((n) => n.id === position)) throw new Error("当前位置不存在");
  if (
    heroes.length < 1 ||
    heroes.length > 4 ||
    new Set(heroes.map((h) => h.id)).size !== heroes.length ||
    heroes.some((h) => !h.id || !Number.isInteger(h.stress) || h.stress < 0 || h.stress > 9)
  )
    throw new Error("英雄 / 压力无效");
  const rng = createRng(seed);
  let cursor = 0;
  for (let i = tokens.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    cursor += 1;
    [tokens[i], tokens[j]] = [tokens[j]!, tokens[i]!];
  }
  return {
    seed,
    notes: [],
    dungeon: {
      layout,
      mode,
      cursor,
      position,
      heroes: heroes.map((h) => ({ ...h })),
      resolveCards: resolveCards.map((c) => ({ ...c, verification: { ...c.verification } })),
      resolveDecks: {},
      // 非起点位置是导航就绪的测试注入；当前房间已知，但不假定代币已清理。
      rooms: slots.map((n, i) => ({ id: n.id, kind: tokens[i]!, revealed: n.id === position })),
      scoutBonus: false,
      phase: "ready",
      pending: null,
      decision: 0,
      exploration: null,
    },
  };
}

function adjacent(d: DungeonState): string[] {
  return d.layout.edges.flatMap(([a, b]) => (a === d.position ? [b] : b === d.position ? [a] : []));
}
/** R14 / R-013：仅计算下一次探索的输入，不掷骰、不移动、不结算房间。 */
export function applyDungeonCommand(
  state: GameState,
  command:
    | DungeonCommand
    | { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  const finish = (dungeon: DungeonState, message: string): ApplyResult => ({
    state: { ...state, dungeon },
    events: [{ type: "dungeonUpdated", message }],
    ...(dungeon.pending ? { pendingChoice: dungeon.pending } : {}),
  });
  if (!d || state.battle) return refuse("需要独立地牢沙盒");
  if (command.type === "resolveDungeonPressure")
    return d.phase === "blockedPressure"
      ? resolveDungeonPressure(state)
      : refuse("当前没有待恢复的侦察压力");
  if (d.phase !== "ready") return refuse("已停在未接线的压力 / 危险结算接口");
  if (command.type === "resolveChoice") {
    if (
      !d.pending ||
      command.choiceId !== d.pending.id ||
      !d.pending.options.some((o) => o.id === command.optionId)
    )
      return refuse("选择不存在、已过期或无效");
    if (d.pending.id.startsWith("dungeon-scout:")) {
      if (command.optionId === "decline")
        return finish({ ...d, pending: null }, "取消侦察，未支付压力");
      const heroes = d.heroes.map((h) => ({ ...h, stress: h.stress + 1 }));
      if (heroes.some((h) => h.stress === 10))
        return resolveDungeonPressure({
          ...state,
          dungeon: { ...d, heroes, pending: null, phase: "blockedPressure", scoutBonus: false },
        });
      const nearby = adjacent(d);
      return finish(
        {
          ...d,
          heroes,
          pending: null,
          scoutBonus: true,
          rooms: d.rooms.map((r) => (nearby.includes(r.id) ? { ...r, revealed: true } : r)),
        },
        "全员同意：每名英雄压力 +1；揭示相邻房间，下一次探索减骰（R14、R-013）",
      );
    }
    return finish(
      {
        ...d,
        pending: null,
        scoutBonus: false,
        phase: "awaitingHazards",
        exploration: {
          from: d.position,
          to: command.optionId,
          dicePerHero: (d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0),
        },
      },
      "下一段探索已选定，等待危险结算；队伍尚未移动",
    );
  }
  if (d.pending) return refuse("请先完成待选决定");
  if (command.type === "scoutDungeon") {
    if (d.layout.nodes.find((n) => n.id === d.position)?.kind !== "room")
      return refuse("灰点不能侦察；起点侦察待 Q-59 确认");
    return finish(
      {
        ...d,
        decision: d.decision + 1,
        pending: {
          id: `dungeon-scout:${d.decision}`,
          prompt: "侦察需要全员同意，每名英雄压力 +1",
          options: [
            { id: "agree", label: "全员同意" },
            { id: "decline", label: "取消" },
          ],
        },
      },
      "等待全员同意",
    );
  }
  const routes = adjacent(d).filter(
    (id) => d.layout.nodes.find((n) => n.id === id)?.kind !== "start",
  );
  if (!routes.length) return refuse("没有可探索的相邻房间 / 灰点；本切片未接原路返回");
  return finish(
    {
      ...d,
      decision: d.decision + 1,
      pending: {
        id: `dungeon-route:${d.decision}`,
        prompt: "选择下一段探索（随后停在危险结算接口）",
        options: routes.map((id) => ({ id, label: id })),
      },
    },
    "等待选择相邻节点",
  );
}
