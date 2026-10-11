import { dungeonLayoutSchema, roomDistributionSchema } from "../../data/src/dungeon-layout";
import type { DungeonLayout, RoomDistribution } from "../../data/src/dungeon-layout";
import type { ApplyResult, GameState, PendingChoice } from "./command";
import { createRng } from "./rng";
import type { ResolveCard } from "./pressure";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { applyDungeonBacktracking } from "./dungeon-backtracking";
import { applyDungeonExploration, continueDungeonExploration } from "./dungeon-exploration";
import type { ExplorationFace } from "../../data/src/exploration";
import type { SkillStance } from "./hero-skill";
import { curioCatalogSchema } from "../../data/src/curio";
import type { CurioCard } from "../../data/src/curio";
import { resolveDungeonCurio } from "./dungeon-curio";

export type DungeonCurioDraw = {
  readonly cardId: string;
  readonly heroId: string;
  readonly rollId: string;
  readonly protected: boolean;
  readonly blockedReason?: string;
};
export type DungeonCurioState = {
  readonly cards: readonly CurioCard[];
  readonly deck: readonly string[] | null;
  readonly discard: readonly string[];
  readonly active: DungeonCurioDraw | null;
  readonly last?: DungeonCurioDraw;
};

export type DungeonExplorationSetup = {
  readonly dungeonLevel: number;
  readonly light: 5;
  readonly provisions: readonly { readonly id: string; readonly face: "food" | "torch" | "tool" }[];
};

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
    readonly stance?: SkillStance;
    readonly level?: number;
    readonly life?: number;
    readonly wounds?: number;
    readonly attributesVerified?: boolean;
  }[];
  readonly resolveCards: readonly ResolveCard[];
  readonly resolveDecks: Partial<Readonly<Record<ResolveCard["role"], readonly string[]>>>;
  readonly gold: number;
  readonly curio?: DungeonCurioState;
  readonly rooms: readonly {
    readonly id: string;
    readonly kind: RoomDistribution["counts"][number]["kind"];
    readonly revealed: boolean;
    readonly cleared?: boolean;
  }[];
  readonly scoutBonus: boolean;
  readonly phase:
    | "ready"
    | "awaitingHazards"
    | "blockedPressure"
    | "awaitingReplacement"
    | "awaitingRoom"
    | "awaitingCurio";
  readonly pressureSource?: "scout" | "exploration" | "backtracking";
  readonly traversedCorridors?: readonly (readonly [string, string])[];
  readonly backtracking?: { readonly from: string; readonly to: string } | null;
  readonly explorationSetup?: DungeonExplorationSetup;
  readonly visited?: readonly string[];
  readonly pending: PendingChoice | null;
  readonly decision: number;
  readonly exploration: {
    readonly from: string;
    readonly to: string;
    readonly dicePerHero: number;
    readonly rolls?: readonly {
      readonly id: string;
      readonly heroId: string;
      readonly face: ExplorationFace;
      readonly resolved: boolean;
    }[];
  } | null;
};
export type DungeonCommand =
  | { readonly type: "scoutDungeon" }
  | { readonly type: "beginDungeonExploration" }
  | { readonly type: "beginDungeonBacktrack" }
  | { readonly type: "rollDungeonExploration" }
  | { readonly type: "resolveDungeonCurio" }
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
  explorationSetup?: DungeonExplorationSetup,
  curioCards?: readonly CurioCard[],
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
      gold: 0,
      ...(curioCards
        ? {
            curio: {
              cards: curioCatalogSchema.parse(curioCards),
              deck: null,
              discard: [],
              active: null,
            },
          }
        : {}),
      // 非起点位置是导航就绪的测试注入；当前房间已知，但不假定代币已清理。
      rooms: slots.map((n, i) => ({ id: n.id, kind: tokens[i]!, revealed: n.id === position })),
      scoutBonus: false,
      phase: "ready",
      pending: null,
      decision: 0,
      exploration: null,
      visited: [position],
      ...(explorationSetup
        ? {
            explorationSetup: {
              ...explorationSetup,
              provisions: explorationSetup.provisions.map((p) => ({ ...p })),
            },
          }
        : {}),
    },
  };
}

function adjacent(d: DungeonState): string[] {
  return d.layout.edges.flatMap(([a, b]) => (a === d.position ? [b] : b === d.position ? [a] : []));
}
/** R14 / R-013：侦察和选路；危险结算委托纯探索模块，完成后才移动。 */
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
  if (
    command.type === "beginDungeonBacktrack" ||
    (command.type === "resolveChoice" && d.pending?.id.startsWith("dungeon-backtrack:"))
  )
    return applyDungeonBacktracking(state, command);
  if (command.type === "resolveDungeonCurio") return resolveDungeonCurio(state);
  if (command.type === "resolveDungeonPressure") {
    if (d.phase !== "blockedPressure") return refuse("当前没有待恢复的压力");
    return continueDungeonExploration(resolveDungeonPressure(state));
  }
  if (
    command.type === "rollDungeonExploration" ||
    (command.type === "resolveChoice" && d.phase === "awaitingHazards")
  )
    return applyDungeonExploration(state, command);
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
          dungeon: {
            ...d,
            heroes,
            pending: null,
            phase: "blockedPressure",
            scoutBonus: false,
            pressureSource: "scout",
          },
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
        backtracking: null,
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
    (id) =>
      d.layout.nodes.find((n) => n.id === id)?.kind !== "start" && !(d.visited ?? []).includes(id),
  );
  if (!routes.length) return refuse("没有可探索的相邻房间 / 灰点；本切片未接原路返回");
  return finish(
    {
      ...d,
      decision: d.decision + 1,
      pending: {
        id: `dungeon-route:${d.decision}`,
        prompt: "选择下一段探索（选定后掷骰，逐英雄结算）",
        options: routes.map((id) => ({ id, label: id })),
      },
    },
    "等待选择相邻节点",
  );
}
