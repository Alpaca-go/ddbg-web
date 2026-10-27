import { curioCatalogSchema } from "../../data/src/curio";
import type { ApplyResult, GameState } from "./command";
import { createRng, rollD10 } from "./rng";
import { drawDungeonCurio, resolveDungeonCurio } from "./dungeon-curio";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});

/** R15 / §5.7：守卫骰只掷一次；未守卫及胜利分支共用完整 Curio 堆。 */
export function beginDungeonCurioRoom(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const room = d.rooms.find((r) => r.id === d.position);
  if (
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room?.kind !== "curio" ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    d.curioRoom?.roomId === d.position ||
    !curioCatalogSchema.safeParse(d.curio?.cards).success ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    d.heroes.some((h) => h.dead)
  )
    return refuse(state, "需要未结算 Curio 房间与完整牌池；守卫骰不能重掷（R15）");
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  const guardRoll = rollD10(rng);
  const guarded = guardRoll <= 5;
  const next: GameState = {
    ...state,
    dungeon: {
      ...d,
      cursor: d.cursor + 1,
      rooms: d.rooms.map((r) => (r.id === d.position && !guarded ? { ...r, cleared: true } : r)),
      curioRoom: { roomId: d.position, guardRoll, stage: guarded ? "guarded" : "reward" },
    },
  };
  const result = guarded ? { state: next, events: [] } : awaitDungeonRoomCurio(next);
  return {
    ...result,
    events: [
      {
        type: "dungeonUpdated",
        message: `Curio 房间守卫骰 ${guardRoll}：${guarded ? "有守卫，须战斗胜利" : "无守卫，选择处理英雄"}（R15）`,
      },
      ...result.events,
    ],
  };
}

export function awaitDungeonRoomCurio(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const reward = d.curioRoom;
  if (
    d.phase !== "awaitingRoom" ||
    !reward ||
    reward.roomId !== d.position ||
    reward.stage !== "reward" ||
    d.pending ||
    d.heroes.some((h) => h.dead)
  )
    return refuse(state, "Curio 房间奖励尚不可处理");
  const pending = {
    id: `dungeon-room-curio-draw:${d.decision}`,
    prompt: "抽卡前决定是否使用 Torch 忽略负面效果（R14–15）",
    options: [
      ...(d.explorationSetup?.provisions ?? [])
        .filter((t) => t.face === "torch")
        .map((t) => ({ id: `use:${t.id}`, label: `先使用 Torch（${t.id}）` })),
      { id: "draw", label: "不用 Torch，抽 Curio" },
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending } },
    events: [
      { type: "dungeonUpdated", message: "房间已清理，等待抽卡前 Torch 决定；尚未抽牌 / 发奖励" },
    ],
    pendingChoice: pending,
  };
}

export function chooseDungeonRoomCurio(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon!;
  const reward = d.curioRoom;
  const p = d.pending;
  if (
    (d.phase !== "awaitingRoom" && d.phase !== "awaitingCurio") ||
    !reward ||
    reward.roomId !== d.position ||
    (reward.stage !== "reward" && reward.stage !== "drawing") ||
    !p ||
    p.id !== choiceId ||
    !p.options.some((o) => o.id === optionId)
  )
    return refuse(state, "房间 Curio 选择不存在、已过期或无效");
  if (p.id.startsWith("dungeon-room-curio-hero:")) {
    const hero = d.heroes.find((h) => h.id === optionId);
    if (
      !hero ||
      hero.dead ||
      reward.stage !== "drawing" ||
      d.curio?.active?.roomId !== d.position ||
      d.curio.active.heroId
    )
      return refuse(state, "Curio 处理英雄无效");
    const passive = triggerDungeonPassive(d, state.seed, [hero.id], "beforeCurio");
    if (passive.status === "refused") return refuse(state, passive.reason);
    const selected = {
      ...passive.dungeon,
      pending: null,
      curioRoom: { ...reward, heroId: hero.id },
      curio: { ...d.curio, active: { ...d.curio.active, heroId: hero.id } },
    };
    if (selected.heroes.some((h) => h.dead)) {
      const cancelled = resolveDungeonCurio({ ...state, dungeon: selected });
      return { ...cancelled, events: [...passive.events, ...cancelled.events] };
    }
    if (selected.heroes.some((h) => h.stress === 10)) {
      const resumed = resolveDungeonPressure({
        ...state,
        dungeon: { ...selected, phase: "blockedPressure", pressureSource: "curioRoom" },
      });
      return { ...resumed, events: [...passive.events, ...resumed.events] };
    }
    return {
      state: { ...state, dungeon: selected },
      events: [
        ...passive.events,
        { type: "dungeonUpdated", message: `${hero.id} 处理已抽房间 Curio，等待结算（R15）` },
      ],
    };
  }
  if (!p.id.startsWith("dungeon-room-curio-draw:") || reward.stage !== "reward")
    return refuse(state, "房间 Curio 抽牌决定无效");
  return drawDungeonCurio(state, `room-curio:${reward.roomId}`, optionId);
}

export function isGuardedDungeonRoom(d: NonNullable<GameState["dungeon"]>): boolean {
  const room = d.rooms.find((r) => r.id === d.position);
  return (
    room?.kind === "lair" ||
    room?.kind === "treasure" ||
    room?.kind === "objective" ||
    (room?.kind === "curio" &&
      d.curioRoom?.roomId === d.position &&
      d.curioRoom.stage === "guarded")
  );
}
