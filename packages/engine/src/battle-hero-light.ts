import { rejectBattleCommand } from "./battle";
import { triggerBattlePassive } from "./battle-passive";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import type { ApplyResult } from "./command";
import type { HeroSkillResolution } from "./hero-skill";
import { resolveBattlePressure } from "./pressure";

/** R20、R28：技能改变光照引起的压力先结清，之后才执行打出暴击的同区减压。 */
export function finishHeroSkillStatuses(
  input: ApplyResult,
  actorId: string,
  resolutions: readonly HeroSkillResolution[],
  deferCritRecovery: boolean,
): ApplyResult {
  const battle = input.state.battle!;
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    actorId,
    deferCritRecovery
      ? resolutions.map((r) => ({ ...r, actorLightDelta: 0, targetLightDelta: 0 }))
      : resolutions,
    input.state.seed,
  );
  if (statuses.status === "refused") return rejectBattleCommand(input.state, statuses.reason);
  let result: ApplyResult = {
    state: {
      ...input.state,
      battle: {
        ...battle,
        entities: statuses.entities,
        light: statuses.light,
        rngCursor: statuses.rngCursor,
      },
    },
    events: [...input.events, ...statuses.events],
  };
  if (!deferCritRecovery) return result;

  const deltas = [
    resolutions[0]?.actorLightDelta ?? 0,
    ...resolutions.map((r) => r.targetLightDelta ?? 0),
  ];
  for (const delta of deltas) {
    const before = result.state.battle!;
    const light = Math.max(0, Math.min(5, before.light + delta));
    if (light === before.light) continue;
    const heroes = before.entities.filter((e) => e.side === "hero" && !e.dead).map((e) => e.id);
    const passive = triggerBattlePassive(
      { ...before, light },
      result.state.seed,
      heroes,
      light > before.light ? "lightRaised" : "lightLowered",
    );
    if (passive.status === "refused") return rejectBattleCommand(input.state, passive.reason);
    result = resolveBattlePressure({
      state: { ...result.state, battle: passive.battle },
      events: [...result.events, ...passive.events],
    });
    if (result.events.some((event) => event.type === "commandRefused")) return result;
  }

  const current = result.state.battle!;
  const actorArea = current.entities.find((e) => e.id === actorId)!.areaId;
  const survivors = current.entities
    .filter((e) => e.side === "hero" && !e.dead && e.areaId === actorArea && e.stress !== undefined)
    .map((e) => e.id);
  const recovered = triggerBattlePassive(current, result.state.seed, survivors, {
    type: "stress",
    amount: -1,
  });
  if (recovered.status === "refused") return rejectBattleCommand(input.state, recovered.reason);
  return {
    state: { ...result.state, battle: recovered.battle },
    events: [
      ...result.events,
      ...recovered.events,
      {
        type: "heroCritAreaResolved",
        actorId,
        message: "光照被动结清后，同区存活英雄结算暴击减压（R20、R-031）",
      },
    ],
  };
}
