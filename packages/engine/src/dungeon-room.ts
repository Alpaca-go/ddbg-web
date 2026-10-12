import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";

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
  if (d.phase !== "awaitingRoom" || d.pending || (d.roomResolution && !d.roomResolution.completed))
    return refuse(state, "当前房间没有可开始的结算；不能重启已有分配");
  if (room?.kind !== "trap" || room.cleared)
    return refuse(state, "本切片仅接未清理的 Trap 房间（R15）");
  const level = d.explorationSetup?.dungeonLevel;
  if (
    !Number.isInteger(level) ||
    level! < 1 ||
    level! > 3 ||
    d.explorationSetup?.light !== 5 ||
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
    return refuse(state, "需要已核实 Life / 伤口 / 压力与 DL 1–3；本切片固定光照 5（R-048）");
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

/** 各英雄各付自己的分配；恢复时已完成者不再进入选项。 */
export function continueDungeonTrap(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const active = d.roomResolution;
  if (!active || active.completed || active.roomId !== d.position || d.phase !== "awaitingRoom")
    return refuse(state, "Trap 房间续接状态无效，保持停点");
  if (d.heroes.some((h) => h.dead))
    return finish(
      state,
      { ...d, pending: null, phase: "awaitingReplacement" },
      `Trap 已记录死亡：队伍在 ${d.position}，等待替换接口；不推定任务 / 战役结果（R9）`,
    );
  const remaining = d.heroes.filter((h) => !active.resolvedHeroIds.includes(h.id));
  if (!remaining.length)
    return finish(
      state,
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
  return finish(state, { ...d, decision: d.decision + 1, pending }, "等待英雄分配伤口 / 压力");
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
  if (wounds > 0 && stress > 0 && (hero.wounds === hero.life || hero.stress + stress >= 10))
    return refuse(state, "混合分配触及死门 / 压力10的结算顺序待 Q-64 确认；未扣任何数值、未掷骰");
  let changed = d;
  const message = `${hero.id}：Trap 承受 ${wounds} 伤口 + ${stress} 压力（R15、R-026）`;
  if (wounds > 0 && hero.attributesVerified !== true)
    return refuse(state, "英雄生命尚未核实（R-048）");
  const passive = triggerDungeonPassive(changed, state.seed, [hero.id], {
    type: "stress",
    amount: stress,
    ...(wounds ? { woundAmounts: [wounds] } : {}),
  });
  if (passive.status === "refused") return refuse(state, passive.reason);
  changed = {
    ...passive.dungeon,
    pending: null,
    roomResolution: { ...active, resolvedHeroIds: [...active.resolvedHeroIds, hero.id] },
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
