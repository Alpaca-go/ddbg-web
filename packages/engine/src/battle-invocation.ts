import { distance, rejectBattleCommand } from "./battle";
import type { BattleArea, BattleState } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { clearAncestorConditions } from "./battle-ancestor";
import { isSmallMonster } from "./battle-small";
import { endAfterCasualties, finishTurn, removeCasualties } from "./encounter";
import { triggerBattlePassive } from "./battle-passive";
import { pressureCasualties, resolveBattlePressure } from "./pressure";

/** R-065：本轮最后一只存活且未行动的怪物；Step 1 仍由先攻入口完整处理。 */
export function isInvokingMonster(battle: BattleState, actorId: string): boolean {
  const encounter = battle.encounter;
  return (
    !!encounter &&
    encounter.turn.type === "monster" &&
    encounter.turn.actorId === actorId &&
    battle.areas.some((area) => area.invokerGoal) &&
    battle.entities.some(
      (entity) => entity.id === actorId && entity.side === "monster" && !entity.dead,
    ) &&
    !battle.entities.some(
      (entity) =>
        entity.side === "monster" &&
        !entity.dead &&
        entity.id !== actorId &&
        !encounter.actedIds.includes(entity.id),
    )
  );
}

/** R24–25、R-023/024/060/065：普通 Speed 移动替代整个 Step 2，不选招、目标或掷骰。 */
export function moveInvokingMonster(
  state: GameState,
  actorId: string,
  chosenArea?: string,
  chosenDisplacement?: string,
): ApplyResult {
  const battle = state.battle!;
  if (!battle || !isInvokingMonster(battle, actorId) || battle.monsterAction)
    return rejectBattleCommand(state, "当前不是 The Invokers 的替代步骤");
  const actor = battle.entities.find((entity) => entity.id === actorId)!;
  const card = battle.monsters?.find((card) => card.id === actor.monsterCardId);
  const origin = battle.areas.find((area) => area.id === actor.areaId);
  const goals = battle.areas.filter((area) => area.invokerGoal);
  if (
    !card ||
    actor.life !== card.life ||
    (actor.stanceSlots !== 1 && actor.stanceSlots !== 2) ||
    !origin ||
    goals.length !== 1
  )
    return rejectBattleCommand(state, "The Invokers 缺少已核实怪物 / 唯一目标区（R-048）");
  const goal = goals[0]!;
  let options = [origin.id];
  if (origin.id !== goal.id && distance(battle.areas, origin.id, goal.id) !== null) {
    if (!Number.isSafeInteger(card.speed) || card.speed! < 0)
      return rejectBattleCommand(state, "缺少已核实 Speed 非负整数（R-048）");
    const living = battle.entities.filter((entity) => !entity.dead && entity.id !== actor.id);
    if (
      living.some(
        (entity) =>
          entity.side === "monster" && entity.stanceSlots !== 1 && entity.stanceSlots !== 2,
      )
    )
      return rejectBattleCommand(state, "缺少占格数，不能猜容量占用（R-048）");
    const reachable = battle.areas.filter((area) => {
      const steps = distance(battle.areas, origin.id, area.id);
      return steps !== null && steps <= card.speed!;
    });
    if (reachable.some((area) => !Number.isSafeInteger(area.capacity) || area.capacity! < 0))
      return rejectBattleCommand(state, "移动候选区域缺少已核实容量（R-048）");
    // 满员和敌方区域仍可穿过；最终落点按明确的 1 / 2 格计算（R18、R24）。
    const occupied = (area: BattleArea) =>
      living
        .filter((entity) => entity.areaId === area.id)
        .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0);
    // 先选择落点，再核对相邻去处；不能因去处满员而偷偷改选或跳过。
    const canEnd = (area: BattleArea) =>
      occupied(area) + actor.stanceSlots! <= area.capacity! ||
      (actor.stanceSlots === 2 && occupied(area) > 0) ||
      (!isSmallMonster(battle, actor) &&
        living.some((e) => e.areaId === area.id && isSmallMonster(battle, e)));
    const legal = reachable.filter(canEnd);
    const scored = legal.map((area) => ({
      id: area.id,
      steps: distance(battle.areas, area.id, goal.id) ?? Infinity,
    }));
    const best = Math.min(...scored.map((area) => area.steps));
    if (!Number.isFinite(best))
      return rejectBattleCommand(state, "没有容量允许的靠近落点（R-048）");
    options = scored.filter((area) => area.steps === best).map((area) => area.id);
  }
  options.sort();
  if (chosenArea !== undefined && !options.includes(chosenArea))
    return rejectBattleCommand(state, "选择的怪物移动落点无效");
  if (chosenArea === undefined && options.length > 1) {
    const choice = {
      id: `monster-move:${battle.choiceCursor}`,
      prompt: "The Invokers：选择最接近 I4 的合法落点",
      options: options.map((id) => ({ id, label: id })),
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "invokerMove", actorId, choice },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const to = chosenArea ?? options[0]!;
  const destination = battle.areas.find((area) => area.id === to)!;
  const living = battle.entities.filter((entity) => !entity.dead && entity.id !== actor.id);
  const slots = (entity: typeof actor) => (entity.side === "hero" ? 1 : entity.stanceSlots!);
  const occupancy = (areaId: string) =>
    living
      .filter((entity) => entity.areaId === areaId)
      .reduce((sum, entity) => sum + slots(entity), 0);
  let displaced: { entityId: string; from: string; to: string } | undefined;
  if (to !== origin.id && occupancy(to) + actor.stanceSlots! > destination.capacity!) {
    const adjacent = destination.adjacent.map((id) => battle.areas.find((area) => area.id === id));
    if (
      adjacent.some((area) => !area || !Number.isSafeInteger(area.capacity) || area.capacity! < 0)
    )
      return rejectBattleCommand(state, "挤出相邻区域缺少已核实容量（R-048）");
    const candidates = living
      .filter(
        (entity) =>
          entity.areaId === to &&
          (actor.stanceSlots === 2 ||
            (!isSmallMonster(battle, actor) && isSmallMonster(battle, entity))) &&
          occupancy(to) + actor.stanceSlots! - slots(entity) <=
            destination.capacity! + (actor.stanceSlots === 2 ? 1 : 0),
      )
      .flatMap((entity) =>
        adjacent
          .filter((area) => occupancy(area!.id) + slots(entity) <= area!.capacity!)
          .map((area) => ({ id: `${entity.id}->${area!.id}`, entityId: entity.id, to: area!.id })),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!candidates.length)
      return rejectBattleCommand(state, "挤出角色没有合法相邻去处；保留移动、RNG 与回合（R-060）");
    if (
      chosenDisplacement !== undefined &&
      !candidates.some((candidate) => candidate.id === chosenDisplacement)
    )
      return rejectBattleCommand(state, "选择的挤出角色或区域无效");
    if (chosenDisplacement === undefined && candidates.length > 1) {
      const choice = {
        id: `monster-displace:${battle.choiceCursor}`,
        prompt:
          actor.stanceSlots === 2
            ? "选择一名角色及其有空间的相邻区域（R-060）"
            : "选择一只 Small 及其有空间的相邻区域（R24）",
        options: candidates.map((candidate) => ({
          id: candidate.id,
          label: `挤出 ${candidate.entityId} → 区域 ${candidate.to}`,
        })),
      };
      return {
        state: {
          ...state,
          battle: {
            ...battle,
            choiceCursor: battle.choiceCursor + 1,
            pending: { type: "invokerDisplace", actorId, choice, to },
          },
        },
        events: [],
        pendingChoice: choice,
      };
    }
    const selected =
      candidates.find((candidate) => candidate.id === chosenDisplacement) ?? candidates[0]!;
    displaced = { entityId: selected.entityId, from: to, to: selected.to };
  }
  return finishTurn(
    {
      ...state,
      battle: {
        ...battle,
        pending: null,
        entities: clearAncestorConditions(
          battle.areas,
          battle.entities.map((entity) =>
            entity.id === actorId
              ? { ...entity, areaId: to }
              : entity.id === displaced?.entityId
                ? { ...entity, areaId: displaced.to }
                : entity,
          ),
        ),
      },
    },
    actorId,
    [
      {
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "theInvokers",
        message: `The Invokers：${origin.id} → ${to}，以向红星移动替代整个第2步${displaced ? `；挤出 ${displaced.entityId} → ${displaced.to}` : ""}`,
      },
    ],
  );
}

/** R-065/069：轮末红星有怪物时，每名存活英雄各一次压力事件，不按怪物数倍增。 */
export function endRoundInvocation(result: ApplyResult): ApplyResult {
  const initial = result.state.battle!;
  if (
    !initial.areas.some(
      (area) =>
        area.invokingAbyss &&
        initial.entities.some(
          (entity) => entity.side === "monster" && !entity.dead && entity.areaId === area.id,
        ),
    )
  )
    return result;
  for (const id of initial.entities
    .filter((entity) => entity.side === "hero" && !entity.dead)
    .map((entity) => entity.id)) {
    const before = result.state.battle!;
    const paid = triggerBattlePassive(before, result.state.seed, [id], {
      type: "stress",
      amount: 2,
    });
    if (paid.status === "refused") return rejectBattleCommand(result.state, paid.reason);
    const pressure = resolveBattlePressure({
      state: { ...result.state, battle: paid.battle },
      events: [
        ...result.events,
        ...paid.events,
        {
          type: "areaStressResolved",
          actorId: id,
          message: "Invoking Abyss：轮末红星有怪物，压力 +2（R-065/069）",
        },
      ],
    });
    if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
    result = removeCasualties(pressure, pressureCasualties(before, pressure));
    const ended = endAfterCasualties(result);
    if (ended) return ended;
  }
  return result;
}
