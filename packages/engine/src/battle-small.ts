import type { BattleEntity, BattleState } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { rejectBattleCommand } from "./battle";

export function isSmallMonster(battle: BattleState, entity: BattleEntity): boolean {
  return (
    entity.side === "monster" &&
    battle.monsters
      ?.find((m) => m.id === entity.monsterCardId)
      ?.type_position_tags?.includes("Small") === true
  );
}

/** R24：英雄结束回合时挤出一只 Small；方向待选期间不重复扣行动或结算 Cornered。 */
export function displaceSmallForHero(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
  optionId?: string,
): ApplyResult | null {
  const b = state.battle!,
    actor = b.entities.find((e) => e.id === actorId)!;
  if (actor.dead || actor.side !== "hero") return null;
  const area = b.areas.find((a) => a.id === actor.areaId)!;
  const living = b.entities.filter((e) => !e.dead);
  const slots = (e: BattleEntity) => (e.side === "hero" ? 1 : e.stanceSlots!);
  const occupancy = (id: string) =>
    living.filter((e) => e.areaId === id).reduce((n, e) => n + slots(e), 0);
  if (area.capacity === undefined || occupancy(area.id) <= area.capacity) return null;
  const small = living.filter((e) => e.areaId === area.id && isSmallMonster(b, e));
  if (!small.length) return null;
  const options = small
    .flatMap((e) =>
      area.adjacent.flatMap((id) => {
        const adjacent = b.areas.find((a) => a.id === id);
        return adjacent?.capacity !== undefined && occupancy(id) + slots(e) <= adjacent.capacity
          ? [{ id: `${e.id}->${id}`, label: `${e.id} → ${id}`, entityId: e.id, to: id }]
          : [];
      }),
    )
    .filter(
      (o) => occupancy(area.id) - slots(living.find((e) => e.id === o.entityId)!) <= area.capacity!,
    )
    .sort((a, c) => a.id.localeCompare(c.id));
  if (!options.length)
    return rejectBattleCommand(state, "Small 没有合法相邻去处；不能结束回合（R18、R24）");
  if (optionId !== undefined && !options.some((o) => o.id === optionId))
    return rejectBattleCommand(state, "选择的 Small / 相邻区域无效");
  if (optionId === undefined && options.length > 1) {
    const choice = {
      id: `small-displace:${b.choiceCursor}`,
      actorId,
      prompt: "结束回合：选择一只 Small 移到有空间的相邻区域（R24）",
      options: options.map(({ id, label }) => ({ id, label })),
    };
    return {
      state: {
        ...state,
        battle: {
          ...b,
          choiceCursor: b.choiceCursor + 1,
          pending: { type: "smallDisplace", actorId, events, choice },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const selected = options.find((o) => o.id === optionId) ?? options[0]!;
  return {
    state: {
      ...state,
      battle: {
        ...b,
        pending: null,
        entities: b.entities.map((e) =>
          e.id === selected.entityId ? { ...e, areaId: selected.to } : e,
        ),
      },
    },
    events: [
      ...events,
      {
        type: "smallMonsterDisplaced",
        actorId,
        entityId: selected.entityId,
        from: area.id,
        to: selected.to,
        message: `结束回合挤出 Small：${selected.entityId} → ${selected.to}（R24）`,
      },
    ],
  };
}
