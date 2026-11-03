import { distance, rejectBattleCommand } from "./battle";
import type { BattleArea } from "./battle";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { applySkillHealth } from "./battle-health";
import { resolveAttackDamage } from "./attack-damage";
import { passiveDamageWounds } from "./passive";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { endAfterCasualties, newlyDefeatedIds, removeCasualties } from "./encounter";
import { resolveBattlePressure } from "./pressure";

/** R-158：橙星区域 C；只投影已确认且 runtimeReady 的 eldritchPower。 */
export function eldritchPowerGoalId(areas: readonly BattleArea[]): string | null {
  const goals = areas.filter((area) => area.eldritchPower);
  return goals.length === 1 ? goals[0]!.id : null;
}

/** R-158：怪物为进射程而移动时，在同等候选里优先靠近橙星。 */
export function preferEldritchPowerMoveOptions(
  areas: readonly BattleArea[],
  originId: string,
  optionIds: readonly string[],
): readonly string[] {
  const goalId = eldritchPowerGoalId(areas);
  if (!goalId || optionIds.length <= 1) return optionIds;
  const scored = optionIds.map((id) => ({
    id,
    steps: distance(areas, id, goalId) ?? Infinity,
  }));
  const best = Math.min(...scored.map((entry) => entry.steps));
  return scored.filter((entry) => entry.steps === best).map((entry) => entry.id);
}

/** R-158：无法进射程时，按 Speed 合法落点里选最接近橙星者（仍属进射程移动步骤）。 */
export function scoreEldritchPowerApproachSteps(
  areas: readonly BattleArea[],
  areaId: string,
  firingAreaIds: readonly string[],
): number {
  const goalId = eldritchPowerGoalId(areas);
  if (goalId) return distance(areas, areaId, goalId) ?? Infinity;
  return Math.min(...firingAreaIds.map((goal) => distance(areas, areaId, goal) ?? Infinity));
}

/** R-158：单个怪物在橙星区结束回合 → 每名存活英雄受到 5 点伤害（非压力）。 */
export function endTurnEldritchPower(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const battle = state.battle!;
  const actor = battle.entities.find((entry) => entry.id === actorId)!;
  if (actor.dead || actor.side !== "monster") return null;
  const area = battle.areas.find((entry) => entry.id === actor.areaId);
  if (!area?.eldritchPower) return null;

  let result: ApplyResult = { state, events };
  const heroIds = battle.entities
    .filter((entry) => entry.side === "hero" && !entry.dead)
    .map((entry) => entry.id)
    .sort();
  for (const heroId of heroIds) {
    const liveBattle = result.state.battle!;
    const hero = liveBattle.entities.find((entry) => entry.id === heroId)!;
    if (hero.dead || !Number.isSafeInteger(hero.life) || hero.life! <= 0)
      return rejectBattleCommand(result.state, "Eldritch Power 伤害需要已核实英雄 Life（R-048）");
    const resolution = fixedDamageResolution(hero, "area:eldritchPower");
    const damage = resolveAttackDamage(hero, 5, false, hero.protection === true).damageDealt;
    const health = applySkillHealth(
      liveBattle,
      liveBattle.entities,
      {
        resolution,
        healthEffects:
          damage > 0
            ? [
                {
                  entityId: heroId,
                  side: "hero" as const,
                  source: "attack" as const,
                  effect: {
                    type: "wounds" as const,
                    amounts: [damage, ...passiveDamageWounds(hero)],
                  },
                },
              ]
            : [],
      },
      result.state.seed,
      liveBattle.rngCursor,
    );
    if (health.status === "refused") return rejectBattleCommand(result.state, health.reason);
    const pressure = resolveBattlePressure({
      state: {
        ...result.state,
        battle: { ...liveBattle, entities: health.entities, rngCursor: health.rngCursor },
      },
      events: [
        ...result.events,
        {
          type: "passiveTriggered",
          entityId: actorId,
          trigger: "eldritchPower",
          message: `Eldritch Power：怪物在 ${area.id} 结束回合，${heroId} 受到 ${damage} 点伤害（R-158）`,
        },
        ...health.events,
      ],
    });
    if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
    result = removeCasualties(
      pressure,
      newlyDefeatedIds(liveBattle, pressure.state.battle!.entities),
    );
    const ended = endAfterCasualties(result);
    if (ended) return ended;
  }
  return result;
}
