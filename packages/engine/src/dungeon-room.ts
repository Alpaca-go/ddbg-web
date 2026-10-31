import { resolveExcavation } from "./darkest-excavation";
import type { ApplyResult, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { changeDungeonLight, settleDungeonLight } from "./dungeon-light";
import { beginDungeonCurioRoom } from "./dungeon-curio-room";
import { beginDungeonObjectiveRoom } from "./dungeon-objective";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});
const finish = (state: GameState, dungeon: DungeonState, message: string): ApplyResult => ({
  state: { ...state, dungeon },
  events: [{ type: "dungeonUpdated", message }],
  ...(dungeon.pending ? { pendingChoice: dungeon.pending } : {}),
});

/** R15 / R-045：房间效果不掷攻击骰，也没有 Tool 抵消选项。 */
export function beginDungeonRoom(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const room = d.rooms.find((r) => r.id === d.position);
  if (d.darkest && room?.kind === "empty" && !room.cleared) return resolveExcavation(state);
  if (room?.kind === "curio") return beginDungeonCurioRoom(state);
  if (room?.kind === "objective" && !room.cleared) return beginDungeonObjectiveRoom(state);
  if (d.phase !== "awaitingRoom" || d.pending || (d.roomResolution && !d.roomResolution.completed))
    return refuse(state, "当前房间没有可开始的结算；不能重启已有分配");
  if (room?.kind === "dark" && !room.cleared) {
    if (!d.explorationSetup) return refuse(state, "Dark 房间缺少光照配置（R-048）");
    const changed = changeDungeonLight(
      {
        ...state,
        dungeon: {
          ...d,
          pressureSource: "room",
          roomResolution: {
            kind: "dark",
            roomId: room.id,
            dungeonLevel: d.explorationSetup.dungeonLevel,
            resolvedHeroIds: [],
            completed: false,
          },
        },
      },
      Math.max(0, d.explorationSetup.light - 1),
    );
    return settleDungeonLight(changed);
  }
  if (room?.kind !== "trap" || room.cleared)
    return refuse(state, "本切片仅接未清理的 Trap 房间（R15）");
  const level = d.explorationSetup?.dungeonLevel;
  if (
    !Number.isInteger(level) ||
    level! < 1 ||
    level! > 3 ||
    !Number.isInteger(d.explorationSetup?.light) ||
    d.explorationSetup!.light < 0 ||
    d.explorationSetup!.light > 5 ||
    d.heroes.some(
      (h) =>
        h.dead ||
        h.attributesVerified !== true ||
        !Number.isInteger(h.life) ||
        h.life! < 1 ||
        !Number.isInteger(h.wounds) ||
        h.wounds! < 0 ||
        h.wounds! > h.life! ||
        !Number.isInteger(h.stress) ||
        h.stress < 0 ||
        h.stress > 9,
    )
  )
    return refuse(state, "需要已核实 Life / 伤口 / 压力、DL 1–3 与光照 0–5（R-048）");
  return continueDungeonTrap({
    ...state,
    dungeon: {
      ...d,
      roomResolution: {
        roomId: room.id,
        dungeonLevel: level!,
        resolvedHeroIds: [],
        completed: false,
      },
      pressureSource: "room",
    },
  });
}

/** R15：Dark 永不清理；光照已降低，意志恢复只完成这次房间入口。 */
export function completeDungeonDarkRoom(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const active = d.roomResolution;
  if (
    !active ||
    active.kind !== "dark" ||
    active.completed ||
    active.roomId !== d.position ||
    d.phase !== "awaitingRoom" ||
    d.heroes.some((h) => h.stress === 10 && !h.dead)
  )
    return refuse(state, "Dark 房间续接状态无效，保持停点");
  return finish(
    state,
    {
      ...d,
      pending: null,
      phase: d.heroes.some((h) => h.dead) ? "awaitingReplacement" : "ready",
      ...(d.heroes.some((h) => h.dead) ? { replacementResume: "ready" as const } : {}),
      roomResolution: { ...active, completed: true },
    },
    `Dark ${d.position} 已结算，保留代币；下次进入仍降低光照（R15）`,
  );
}

/** 各英雄各付自己的分配；恢复时已完成者不再进入选项。 */
export function continueDungeonTrap(state: GameState): ApplyResult {
  let d = state.dungeon!;
  let active = d.roomResolution;
  if (!active || active.completed || active.roomId !== d.position || d.phase !== "awaitingRoom")
    return refuse(state, "Trap 房间续接状态无效，保持停点");
  const events: GameEvent[] = [];
  const emit = (dungeon: DungeonState, message: string): ApplyResult => {
    const result = finish(state, dungeon, message);
    return { ...result, events: [...events, ...result.events] };
  };
  if (active.pendingAllocation) {
    const allocation = active.pendingAllocation;
    const hero = d.heroes.find((h) => h.id === allocation.heroId);
    if (
      !hero ||
      active.resolvedHeroIds.includes(hero.id) ||
      !Number.isInteger(allocation.wounds) ||
      allocation.wounds < 0 ||
      allocation.wounds > active.dungeonLevel ||
      (!hero.dead && hero.stress === 10)
    )
      return refuse(state, "Trap 分配续接无效，伤口尚未支付");
    if (!hero.dead && allocation.wounds > 0) {
      const health = triggerDungeonPassive(d, state.seed, [hero.id], {
        type: "stress",
        amount: 0,
        woundAmounts: [allocation.wounds],
      });
      if (health.status === "refused") return refuse(state, health.reason);
      d = health.dungeon;
      events.push(...health.events);
    }
    const { pendingAllocation: _settled, ...remainingResolution } = active;
    void _settled;
    active = { ...remainingResolution, resolvedHeroIds: [...active.resolvedHeroIds, hero.id] };
    d = { ...d, pending: null, roomResolution: active };
    events.push({
      type: "dungeonUpdated",
      message: hero.dead
        ? `${hero.id} 已死亡，取消 Trap 剩余伤口（R-069）`
        : `${hero.id} Trap 压力后伤口已结算（R-069）`,
    });
  }
  if (d.heroes.some((h) => h.dead))
    return emit(
      { ...d, pending: null, phase: "awaitingReplacement", replacementResume: "trap" },
      `Trap 已记录死亡：队伍在 ${d.position}，等待替换接口；不推定任务 / 战役结果（R9）`,
    );
  const remaining = d.heroes.filter((h) => !active.resolvedHeroIds.includes(h.id));
  if (!remaining.length)
    return emit(
      { ...d, pending: null, phase: "ready", roomResolution: { ...active, completed: true } },
      `Trap ${d.position} 全员结算完成，保留代币；下次进入仍需结算（R15）`,
    );
  const pending = {
    id: `dungeon-trap-hero:${d.decision}`,
    prompt: `Trap ${d.position}：选择尚未分配的英雄，每人总计 ${active.dungeonLevel} 点（R15）`,
    options: remaining.map((h) => ({
      id: h.id,
      label: `${h.id}：分配陷阱房 ${active.dungeonLevel} 点`,
    })),
  };
  return emit({ ...d, decision: d.decision + 1, pending }, "等待英雄分配伤口 / 压力");
}

export function chooseDungeonTrap(
  state: GameState,
  command: { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon!;
  const active = d.roomResolution;
  const pending = d.pending;
  if (
    d.phase !== "awaitingRoom" ||
    !active ||
    active.completed ||
    active.roomId !== d.position ||
    !pending ||
    command.choiceId !== pending.id ||
    !pending.options.some((o) => o.id === command.optionId)
  )
    return refuse(state, "Trap 分配不存在、已过期或当前不可结算");
  if (pending.id.startsWith("dungeon-trap-hero:")) {
    const hero = d.heroes.find((h) => h.id === command.optionId);
    if (!hero || hero.dead || active.resolvedHeroIds.includes(hero.id))
      return refuse(state, "英雄已结算或无效");
    const options = Array.from({ length: active.dungeonLevel + 1 }, (_, wounds) => ({
      id: String(wounds),
      label: `${wounds} 伤口 + ${active.dungeonLevel - wounds} 压力`,
    }));
    return finish(
      state,
      {
        ...d,
        decision: d.decision + 1,
        pending: {
          id: `dungeon-trap-split:${d.decision}`,
          actorId: hero.id,
          prompt: `${hero.id}：自行分配总计 ${active.dungeonLevel} 点，Tool 不能抵消（R15、R-045）`,
          options,
        },
      },
      "尚未支付伤口 / 压力",
    );
  }
  const hero = d.heroes.find((h) => h.id === pending.actorId);
  const wounds = Number(command.optionId);
  const stress = active.dungeonLevel - wounds;
  if (
    !pending.id.startsWith("dungeon-trap-split:") ||
    !hero ||
    hero.dead ||
    active.resolvedHeroIds.includes(hero.id) ||
    !Number.isInteger(wounds) ||
    wounds < 0 ||
    stress < 0 ||
    !Number.isInteger(hero.stress) ||
    hero.stress < 0 ||
    hero.stress > 9
  )
    return refuse(state, "Trap 分配数值 / 英雄无效");
  let changed = d;
  const message = `${hero.id}：Trap 承受 ${wounds} 伤口 + ${stress} 压力（R15、R-026）`;
  if (wounds > 0 && hero.attributesVerified !== true)
    return refuse(state, "英雄生命尚未核实（R-048）");
  const passive = triggerDungeonPassive(changed, state.seed, [hero.id], {
    type: "stress",
    amount: stress,
  });
  if (passive.status === "refused") return refuse(state, passive.reason);
  changed = {
    ...passive.dungeon,
    pending: null,
    roomResolution: { ...active, pendingAllocation: { heroId: hero.id, wounds } },
  };
  const next = changed.heroes.some((h) => !h.dead && h.stress === 10)
    ? resolveDungeonPressure({
        ...state,
        dungeon: { ...changed, phase: "blockedPressure", pressureSource: "room" },
      })
    : continueDungeonTrap({ ...state, dungeon: changed });
  return {
    ...next,
    events: [{ type: "dungeonUpdated", message }, ...passive.events, ...next.events],
  };
}
