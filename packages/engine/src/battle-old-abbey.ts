import { healingTrinketReaction } from "./trinket-reactions";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { triggerBattlePassive } from "./battle-passive";
import { pressureCasualties, resolveBattlePressure } from "./pressure";
import { endAfterCasualties, removeCasualties } from "./encounter";
import { passiveHeal } from "./passive";
import { resolveHeroHealth } from "./hero-health";
import { healingForbidden } from "./battle-healing";

/** R-065/069：一批压力先收尾，存活才恢复Life；零项不触发空恢复事件。 */
export function endTurnOldAbbey(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const battle = state.battle!,
    actor = battle.entities.find((e) => e.id === actorId)!;
  if (
    actor.dead ||
    actor.side !== "hero" ||
    !battle.areas.find((a) => a.id === actor.areaId)?.feelingThePresence
  )
    return null;
  const held = actor.quirkIds ?? [];
  if (
    held.length &&
    (!battle.conditions ||
      conditionPoolProblem(
        battle.conditions,
        battle.entities.filter((e) => e.side === "hero"),
      ))
  )
    return rejectBattleCommand(state, "Feeling the Presence需要完整已核实怪癖池（R-048）");
  const count = (polarity: "positive" | "negative") =>
    held.filter((id) =>
      battle.conditions!.quirks.some((q) => q.id === id && q.polarity === polarity),
    ).length;
  const negative = held.length ? count("negative") : 0,
    positive = held.length ? count("positive") : 0;
  if (
    positive &&
    (!Number.isInteger(actor.heroLevel) || actor.heroLevel! < 1 || actor.heroLevel! > 3)
  )
    return rejectBattleCommand(state, "Feeling the Presence治疗需要已核实英雄等级（R-048）");
  let result: ApplyResult = { state, events };
  if (negative) {
    const paid = triggerBattlePassive(battle, state.seed, [actorId], {
      type: "stress",
      amount: negative,
    });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    const pressure = resolveBattlePressure({
      state: { ...state, battle: paid.battle },
      events: [
        ...events,
        ...paid.events,
        {
          type: "areaStressResolved",
          actorId,
          message: `Feeling the Presence：负面怪癖${negative}个，单次压力 +${negative}（R-069）`,
        },
      ],
    });
    if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
    result = removeCasualties(pressure, pressureCasualties(battle, pressure));
    const ended = endAfterCasualties(result);
    if (ended) return ended;
  }
  const live = result.state.battle!.entities.find((e) => e.id === actorId)!;
  if (!live.dead && positive) {
    if (healingForbidden(result.state.battle!, actorId))
      return {
        ...result,
        events: [
          ...result.events,
          {
            type: "healingPrevented",
            entityId: actorId,
            message: "Unholy Aura：Old Abbey自动治疗已阻止（R-067）",
          },
        ],
      };
    const effect = {
      type: "heal" as const,
      amount: passiveHeal(
        live,
        healingTrinketReaction(
          result.state.battle!,
          undefined,
          live.id,
          positive * live.heroLevel!,
        ),
      ),
    };
    const health = resolveHeroHealth(
      { life: live.life!, wounds: live.wounds, dead: live.dead },
      effect,
    );
    if (health.status !== "resolved")
      return rejectBattleCommand(
        state,
        health.status === "refused" ? health.reason : "Old Abbey治疗不应掷死门",
      );
    result = {
      state: {
        ...result.state,
        battle: {
          ...result.state.battle!,
          entities: result.state.battle!.entities.map((e) =>
            e.id === actorId ? { ...e, wounds: health.state.wounds } : e,
          ),
        },
      },
      events: [
        ...result.events,
        {
          type: "heroHealthResolved",
          entityId: actorId,
          effect,
          resolution: health,
          message: `Feeling the Presence：存活英雄按HL ${live.heroLevel} × 正面怪癖${positive}个治疗，恢复修正一次（R-069）`,
        },
      ],
    };
  }
  return result;
}
