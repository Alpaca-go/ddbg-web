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
import { roomCatalogSchema } from "../../data/src/room";
import type { RoomCard } from "../../data/src/room";
import { prepareDungeonBattle } from "./dungeon-battle-preparation";
import { prepareDungeonMonsters } from "./dungeon-monsters";
import { monsterPoolCatalogSchema } from "../../data/src/monster-pool";
import type { MonsterPoolCard } from "../../data/src/monster-pool";
import type { SpawnPlacement } from "./spawn";
import { curioCatalogSchema } from "../../data/src/curio";
import type { CurioCard } from "../../data/src/curio";
import { resolveDungeonCurio } from "./dungeon-curio";
import { beginDungeonRoom, chooseDungeonTrap } from "./dungeon-room";
import type { BattleEntity, BattleSetup } from "./battle";
import type { MonsterCardView } from "./monster-skill";
import type { LootState, ProvisionFace } from "./loot";
import type { ConditionPool } from "./conditions";
import type { PassiveHero } from "./passive-runtime";
import { triggerDungeonPassive } from "./dungeon-passive";
import type { TrinketPool } from "./trinket-acquisition";

export type DungeonCurioDraw = {
  readonly positiveRewardCursor?: number;
  readonly trinketApplied?: boolean;
  readonly positiveQuirkApplied?: boolean;
  readonly provisionFace?: ProvisionFace | "wild";
  readonly diseasesApplied?: number;
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
  readonly light: number;
  readonly provisions: readonly { readonly id: string; readonly face: ProvisionFace }[];
};

/** 与 BattleSetup 一样，由调用方的已校验规范化数据提供，不从 UI 推导规则。 */
export type DungeonBattleCatalog = {
  readonly trinkets?: TrinketPool;
  readonly conditions?: ConditionPool;
  readonly heroStats: readonly (NonNullable<BattleSetup["heroStats"]>[number] & {
    readonly level: number;
    readonly dodge: number;
  })[];
  readonly skills: readonly (BattleSetup["skills"][number] & { readonly level: number })[];
  readonly monsters: readonly (MonsterCardView & {
    readonly name: string;
    readonly level: number;
    readonly dodge: number;
  })[];
};

export type DungeonState = {
  readonly trinkets?: TrinketPool;
  readonly pendingCurioDraw?: { readonly rollId: string; readonly optionId: string };
  readonly conditions?: ConditionPool;
  readonly layout: DungeonLayout;
  readonly mode: "standard" | "radiant";
  readonly cursor: number;
  readonly position: string;
  readonly heroes: readonly (PassiveHero & {
    readonly id: string;
    readonly stress: number;
    readonly resolveTested?: boolean | undefined;
    readonly resolveCardId?: string | undefined;
    readonly dead?: boolean;
    readonly stance?: SkillStance;
    readonly level?: number;
    readonly life?: number;
    readonly wounds?: number;
    readonly attributesVerified?: boolean;
    readonly heroStatId?: string;
    readonly skillIds?: readonly string[];
    /** 跨房间保留的战斗状态；部署只改变区域，不重置英雄。 */
    readonly combat?: BattleEntity;
  })[];
  readonly resolveCards: readonly ResolveCard[];
  readonly resolveDecks: Partial<Readonly<Record<ResolveCard["role"], readonly string[]>>>;
  readonly gold: number;
  readonly lootPool?: LootState;
  readonly battleCatalog?: DungeonBattleCatalog;
  readonly mustLeaveRoomId?: string | undefined;
  readonly monsterPool?: {
    readonly cards: readonly MonsterPoolCard[];
    readonly remaining: readonly string[] | null;
    readonly discarded: readonly string[];
    readonly active: {
      readonly roomId: string;
      readonly monsters: readonly SpawnPlacement[];
      readonly blockedReason: string;
    } | null;
  };
  readonly curio?: DungeonCurioState;
  readonly roomCards?: {
    readonly cards: readonly RoomCard[];
    readonly deck: readonly string[] | null;
    readonly discard?: readonly string[];
    readonly active: {
      readonly roomId: string;
      readonly cardId: string;
      readonly tileId?: string;
      readonly blockedReason: string;
    } | null;
  };
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
    | "inBattle"
    | "awaitingCurio";
  readonly pressureSource?: "scout" | "exploration" | "backtracking" | "room" | "provision";
  readonly roomResolution?: {
    /** 旧 Trap 快照缺少 kind 时仍按 Trap 读取。 */
    readonly kind?: "trap" | "dark";
    readonly roomId: string;
    readonly dungeonLevel: number;
    readonly resolvedHeroIds: readonly string[];
    readonly completed: boolean;
  };
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
  | { readonly type: "prepareDungeonBattle" }
  | { readonly type: "prepareDungeonMonsters" }
  | { readonly type: "resolveDungeonRoom" }
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
  roomCards?: readonly RoomCard[],
  monsterCards?: readonly MonsterPoolCard[],
  battleCatalog?: DungeonBattleCatalog,
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
      ...(battleCatalog ? { battleCatalog } : {}),
      ...(battleCatalog?.conditions ? { conditions: battleCatalog.conditions } : {}),
      ...(battleCatalog?.trinkets ? { trinkets: battleCatalog.trinkets } : {}),
      ...(monsterCards
        ? {
            monsterPool: {
              cards: monsterPoolCatalogSchema.parse(monsterCards),
              remaining: null,
              discarded: [],
              active: null,
            },
          }
        : {}),
      ...(roomCards
        ? { roomCards: { cards: roomCatalogSchema.parse(roomCards), deck: null, active: null } }
        : {}),
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
  let d = state.dungeon;
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
  if (command.type === "prepareDungeonBattle") return prepareDungeonBattle(state);
  if (command.type === "prepareDungeonMonsters") return prepareDungeonMonsters(state);
  if (command.type === "resolveDungeonRoom") return beginDungeonRoom(state);
  if (command.type === "resolveChoice" && d.pending?.id.startsWith("dungeon-trap-"))
    return chooseDungeonTrap(state, command);
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
      const passive = triggerDungeonPassive(
        d,
        state.seed,
        d.heroes.map((h) => h.id),
        { type: "stress", amount: 1 },
      );
      if (passive.status === "refused") return refuse(passive.reason);
      const heroes = passive.dungeon.heroes;
      d = passive.dungeon;
      if (heroes.some((h) => h.dead)) {
        const stopped = finish(
          { ...passive.dungeon, phase: "awaitingReplacement", pending: null, scoutBonus: false },
          "侦察压力被动导致死亡，等待英雄替换（R9）",
        );
        return { ...stopped, events: [...passive.events, ...stopped.events] };
      }
      if (heroes.some((h) => h.stress === 10)) {
        const pressure = resolveDungeonPressure({
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
        return { ...pressure, events: [...passive.events, ...pressure.events] };
      }
      const nearby = adjacent(d);
      const scouted = finish(
        {
          ...d,
          heroes,
          pending: null,
          scoutBonus: true,
          rooms: d.rooms.map((r) => (nearby.includes(r.id) ? { ...r, revealed: true } : r)),
        },
        "全员同意：每名英雄压力 +1；揭示相邻房间，下一次探索减骰（R14、R-013）",
      );
      return { ...scouted, events: [...passive.events, ...scouted.events] };
    }
    return finish(
      {
        ...d,
        pending: null,
        backtracking: null,
        pressureSource: "exploration",
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
    if (d.mustLeaveRoomId === d.position) return refuse("第四轮撤退后须先离开房间（R25）");
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
