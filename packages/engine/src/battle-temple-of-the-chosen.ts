import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { conditionPoolProblem } from "./conditions";
import { triggerBattlePassive } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";
import { endAfterCasualties, newlyDefeatedIds, removeCasualties } from "./encounter";
import { captureFallenHeroes } from "./fallen-heroes";
import { releaseDeadHeroCards } from "./hero-death-cards";

/** R-161/171：橙星A的怪物回合结束，先治疗全体怪物，再逐名结算英雄压力。 */
export function endTurnRiteOfTheChosen(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId)!;
  if (
    actor.dead ||
    actor.side !== "monster" ||
    !b.areas.find((a) => a.id === actor.areaId)?.riteOfTheChosen
  )
    return null;
  const heroes = b.entities.filter((e) => e.side === "hero");
  if (
    heroes.some((e) => e.quirkIds?.length) &&
    (!b.conditions || conditionPoolProblem(b.conditions, heroes))
  )
    return rejectBattleCommand(state, "Rite of the Chosen需要完整怪癖池（R-048）");
  if (
    b.entities.some(
      (e) =>
        e.side === "monster" &&
        !e.dead &&
        (!Number.isSafeInteger(e.life) ||
          e.life! <= 0 ||
          !Number.isSafeInteger(e.wounds) ||
          e.wounds < 0),
    )
  )
    return rejectBattleCommand(state, "Rite of the Chosen治疗需要已核实Life和伤口（R-048）");
  let result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...b,
        entities: b.entities.map((e) =>
          e.side === "monster" && !e.dead ? { ...e, wounds: Math.max(0, e.wounds - 5) } : e,
        ),
      },
    },
    events: [
      ...events,
      {
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "riteOfTheChosen",
        message: "Rite of the Chosen：全体存活怪物治疗5，不超过Life（R-161/171）",
      },
    ],
  };
  const ids = ["aggressive", "defensive", "ranged", "support"].flatMap((stance) =>
    heroes.filter((e) => !e.dead && e.stance === stance).map((e) => e.id),
  );
  for (const id of ids) {
    const live = result.state.battle!;
    const hero = live.entities.find((e) => e.id === id)!;
    if (hero.dead) continue;
    const negative = (hero.quirkIds ?? []).filter((q) =>
      live.conditions!.quirks.some((c) => c.id === q && c.polarity === "negative"),
    ).length;
    const paid = triggerBattlePassive(live, state.seed, [id], {
      type: "stress",
      amount: 1 + negative,
    });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    const pressure = resolveBattlePressure({
      state: { ...result.state, battle: paid.battle },
      events: [
        ...result.events,
        ...paid.events,
        {
          type: "areaStressResolved",
          actorId: id,
          message: `Rite of the Chosen：自身负面怪癖${negative}个，单次压力+${1 + negative}（R-171）`,
        },
      ],
    });
    if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
    result = removeCasualties(pressure, newlyDefeatedIds(live, pressure.state.battle!.entities));
    // R-091：先归还死者共享卡，再处理下一名英雄可能发生的意志抽牌。
    result = releaseDeadHeroCards(captureFallenHeroes(result));
    if (result.events.some((e) => e.type === "commandRefused")) return result;
    const ended = endAfterCasualties(result);
    if (ended) return ended;
  }
  return result;
}
