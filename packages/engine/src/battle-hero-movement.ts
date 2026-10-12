import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { finishTurn, removeCasualties, endAfterCasualties, newlyDefeatedIds } from "./encounter";
import { resolveBattlePressure } from "./pressure";
import { triggerBattlePassive } from "./battle-passive";
import { isSmallMonster } from "./battle-small";

export type MoveHeroCommand = {
  readonly type: "moveHero";
  readonly actorId: string;
  /** 玩家明确选择的路径，不含起点；每项是相邻区域。 */
  readonly path: readonly string[];
};

export type HeroMovedEvent = {
  readonly type: "heroMoved";
  readonly actorId: string;
  readonly from: string;
  readonly to: string;
  readonly path: readonly string[];
  readonly mustMove: boolean;
  readonly message: string;
};

/** 官方 R18 Move、R-006 / R-021 / R-048：只改区域，不改姿态，不消费 RNG。 */
export function moveHero(state: GameState, command: MoveHeroCommand): ApplyResult {
  const battle = state.battle;
  const turn = battle?.encounter?.turn;
  const actor = battle?.entities.find((entity) => entity.id === command.actorId);
  if (
    !battle ||
    !actor ||
    actor.side !== "hero" ||
    actor.dead ||
    turn?.type !== "hero" ||
    turn.actorId !== actor.id ||
    turn.actions <= 0
  )
    return rejectBattleCommand(state, "当前不是这名存活英雄的行动回合");
  const stat = battle.heroStats?.find((entry) => entry.id === actor.heroStatId);
  if (
    stat?.attributesVerified !== true ||
    stat.name !== actor.hero ||
    stat.life !== actor.life ||
    !Number.isSafeInteger(stat.speed) ||
    stat.speed! < 0
  )
    return rejectBattleCommand(state, "移动需要关联已核实 Speed 的英雄属性面（R-048）");
  if (
    !Array.isArray(command.path) ||
    command.path.length === 0 ||
    command.path.length > stat.speed!
  )
    return rejectBattleCommand(state, "路径必须包含移动区域且步数不得超过 Speed");
  let from = actor.areaId;
  for (const id of command.path) {
    if (!battle.areas.find((area) => area.id === from)?.adjacent.includes(id))
      return rejectBattleCommand(state, "移动路径必须逐步相邻，不可穿墙或跨断图（R-021）");
    from = id;
  }
  if (turn.mustMove && from === actor.areaId)
    return rejectBattleCommand(state, "必须移动离开无空间区域（R18）");
  const area = battle.areas.find((entry) => entry.id === from)!;
  if (!Number.isSafeInteger(area.capacity) || area.capacity! < 0)
    return rejectBattleCommand(state, "落点缺少已核实容量（R-048）");
  const others = battle.entities.filter(
    (entity) => !entity.dead && entity.id !== actor.id && entity.areaId === from,
  );
  if (
    others.some(
      (entity) => entity.side === "monster" && entity.stanceSlots !== 1 && entity.stanceSlots !== 2,
    )
  )
    return rejectBattleCommand(state, "落点怪物缺少已核实占格数（R-048）");
  const occupied = others.reduce(
    (sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!),
    0,
  );
  const mustMove = occupied + 1 > area.capacity! && !others.some((e) => isSmallMonster(battle, e));
  if (mustMove && turn.actions === 1)
    return rejectBattleCommand(state, "最后行动不能停在无空间区域；小型怪挤占尚未接入（R18、R24）");
  let next: GameState = {
    ...state,
    battle: {
      ...battle,
      entities: battle.entities.map((entity) =>
        entity.id === actor.id ? { ...entity, areaId: from } : entity,
      ),
      encounter: { ...battle.encounter!, turn: { ...turn, actions: turn.actions - 1, mustMove } },
    },
  };
  const passive = triggerBattlePassive(next.battle!, state.seed, [actor.id], "moveAction");
  if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
  next = { ...next, battle: passive.battle };
  const events: HeroMovedEvent[] = [
    {
      type: "heroMoved",
      actorId: actor.id,
      from: actor.areaId,
      to: from,
      path: [...command.path],
      mustMove,
      message: mustMove ? "消耗移动行动，下一行动必须离开无空间区域" : "消耗移动行动，只改变区域",
    },
  ];
  const pressure = resolveBattlePressure({ state: next, events: [...events, ...passive.events] });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(
    pressure,
    newlyDefeatedIds(battle, pressure.state.battle!.entities),
  );
  const ended = endAfterCasualties(removed);
  return (
    ended ??
    (turn.actions === 1 || removed.state.battle!.entities.find((e) => e.id === actor.id)!.dead
      ? finishTurn(removed.state, actor.id, removed.events)
      : removed)
  );
}
