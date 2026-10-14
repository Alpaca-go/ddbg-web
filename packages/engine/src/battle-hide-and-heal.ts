import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { healingForbidden } from "./battle-healing";
import { triggerBattlePassive } from "./battle-passive";
import { pressureCasualties, resolveBattlePressure } from "./pressure";
import { endAfterCasualties, finishTurn, removeCasualties } from "./encounter";
import { resolveHeroHealth } from "./hero-health";

/** R-065/069/073：先支付行动与压力，存活者直接清空伤口，不应用治疗数值修正。 */
export function hideAndHeal(state: GameState, actorId: string): ApplyResult {
  const battle = state.battle,
    turn = battle?.encounter?.turn,
    actor = battle?.entities.find((e) => e.id === actorId);
  if (
    !battle ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 1 ||
    turn.mustMove ||
    !actor ||
    actor.side !== "hero" ||
    actor.dead ||
    !battle.areas.find((a) => a.id === actor.areaId)?.hideAndHeal ||
    battle.entities.some((e) => e.side === "monster" && !e.dead && e.areaId === actor.areaId) ||
    battle.pending ||
    battle.shuffleIntents.length ||
    battle.shuffleContinuation
  )
    return rejectBattleCommand(
      state,
      "Hide and Heal需要当前英雄在无怪物的T6、有1行动且无需强制移动（R-065）",
    );
  if (healingForbidden(battle, actorId))
    return rejectBattleCommand(
      state,
      "Unholy Aura禁止Hide and Heal，未支付行动或压力（R-067/073）",
    );
  const health = resolveHeroHealth(
    { life: actor.life!, wounds: actor.wounds, dead: actor.dead },
    { type: "heal", amount: actor.wounds },
  );
  if (health.status !== "resolved")
    return rejectBattleCommand(
      state,
      health.status === "refused" ? health.reason : "移除伤口不应掷死门",
    );
  const paid = triggerBattlePassive(battle, state.seed, [actorId], { type: "stress", amount: 2 });
  if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: {
        ...paid.battle,
        encounter: { ...battle.encounter!, turn: { ...turn, actions: turn.actions - 1 } },
      },
    },
    events: [
      ...paid.events,
      {
        type: "roomInteractionResolved",
        actorId,
        message: "Hide and Heal：花1行动，先结算压力 +2及追加伤口／死门／意志（R-069）",
      },
    ],
  });
  // 后续预检失败也回滚整次命令，包括行动、压力和RNG。
  const refused = pressure.events.find((e) => e.type === "commandRefused");
  if (refused) return rejectBattleCommand(state, refused.message);
  let result = removeCasualties(pressure, pressureCasualties(battle, pressure));
  const ended = endAfterCasualties(result);
  if (ended) return ended;
  const live = result.state.battle!.entities.find((e) => e.id === actorId)!;
  if (!live.dead)
    result = {
      state: {
        ...result.state,
        battle: {
          ...result.state.battle!,
          entities: result.state.battle!.entities.map((e) =>
            e.id === actorId ? { ...e, wounds: 0 } : e,
          ),
        },
      },
      events: [
        ...result.events,
        {
          type: "roomInteractionResolved",
          actorId,
          message: `Hide and Heal：存活，移除全部${live.wounds}伤口；不应用Infirm／Fast Healer（R-073）`,
        },
      ],
    };
  return live.dead || turn.actions === 1
    ? finishTurn(result.state, actorId, result.events)
    : result;
}
