import { distance, rejectBattleCommand, writeResolution } from "./battle";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import {
  encounterSkillProblem,
  nextBattleRoll,
  newlyDefeatedIds,
  recordEncounterSkill,
} from "./encounter";
import { resolveHeroSkillEmptyAreaEffects } from "./hero-skill";
import { resolveShuffle } from "./shuffle";
import type { ShuffleIntent } from "./shuffle";
import type { ApplyResult, GameState, HeroSkillEmptyAreaResolvedEvent } from "./command";

export type PlayHeroSkillEmptyAreaCommand = {
  readonly type: "playHeroSkillEmptyArea";
  readonly actorId: string;
  readonly skillId: string;
  readonly areaId: string;
};

/** R19–20 / R-025：真正空区域也消耗一次技能使用；没有目标结算或暴击压力。 */
export function playHeroSkillEmptyArea(
  state: GameState,
  command: PlayHeroSkillEmptyAreaCommand,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const problem = encounterSkillProblem(battle, command.actorId, command.skillId);
  if (problem) return rejectBattleCommand(state, problem);
  const actor = battle.entities.find((e) => e.id === command.actorId);
  const skill = battle.skills.find((s) => s.id === command.skillId);
  const area = battle.areas.find((a) => a.id === command.areaId);
  if (
    !actor ||
    actor.dead ||
    actor.side !== "hero" ||
    !skill ||
    !actor.skillIds.includes(skill.id) ||
    (skill.hero !== null && skill.hero !== actor.hero)
  )
    return rejectBattleCommand(state, "使用者或装备技能不可用");
  if (!area || battle.entities.some((e) => !e.dead && e.areaId === area.id))
    return rejectBattleCommand(state, "须选择没有存活角色的空区域（R19）");
  const actorArea = battle.areas.find((a) => a.id === actor.areaId);
  const areaDistance = distance(battle.areas, actor.areaId, area.id);
  if (!actorArea || areaDistance === null)
    return rejectBattleCommand(state, "空区域须与使用者连通（R19 / R-021）");
  const heights = { low: 0, normal: 1, high: 2 };
  const combat = {
    actor,
    light: battle.light,
    areaDistance,
    targetAreaLower: heights[actorArea.elevation] > heights[area.elevation],
    guardedEnemyOmitted: battle.entities.some((e) => !e.dead && e.side === "monster" && e.guard),
  };
  const probe = resolveHeroSkillEmptyAreaEffects(skill, combat, 1);
  if (
    probe.resolution.status === "refused" ||
    probe.resolution.skipped.some((s) => s.code === "effect_lines")
  )
    return rejectBattleCommand(
      state,
      probe.resolution.reason ?? "空区域技能效果未完整支持，整次拒绝（R-048）",
    );
  const statusProbe = applyBattleSkillStatuses(battle, battle.entities, actor.id, [
    probe.resolution,
  ]);
  if (statusProbe.status === "refused") return rejectBattleCommand(state, statusProbe.reason);
  // R21：自身位移以技能目标区域为参照，不创建虚构目标角色。
  const intent: ShuffleIntent | null = probe.resolution.actorShuffle
    ? { entityId: actor.id, relativeToAreaId: area.id, move: probe.resolution.actorShuffle }
    : null;
  if (intent) {
    const shuffle = resolveShuffle(battle, intent);
    if (shuffle.status === "refused") return rejectBattleCommand(state, shuffle.reason);
  }
  // R19：卡面有 Acc 才掷骰；没有目标时不把骰面判成命中 / 暴击。
  const roll = skill.printed_labels.some((label) => label.label === "Acc")
    ? nextBattleRoll(state.seed, battle.rngCursor)
    : null;
  const effects = roll === null ? probe : resolveHeroSkillEmptyAreaEffects(skill, combat, roll);
  const entities = battle.entities.map((e) =>
    writeResolution(e, actor.id, "", effects.resolution, false),
  );
  const health = applySkillHealth(
    battle,
    entities,
    effects,
    state.seed,
    battle.rngCursor + Number(roll !== null),
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const statuses = applyBattleSkillStatuses(battle, health.entities, actor.id, [
    effects.resolution,
  ]);
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const event: HeroSkillEmptyAreaResolvedEvent = {
    type: "heroSkillEmptyAreaResolved",
    message: "英雄技能已对空区域使用，计为成功（R-025）",
    actorId: actor.id,
    skillId: skill.id,
    areaId: area.id,
    roll,
  };
  const casualtyIds = newlyDefeatedIds(battle, health.entities);
  const result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...battle,
        entities: statuses.entities,
        light: statuses.light,
        rngCursor: health.rngCursor,
        shuffleIntents: intent ? [intent] : [],
        shuffleContinuation: intent ? { ...event, casualtyIds } : null,
      },
    },
    events: [event, ...health.events],
  };
  return intent ? result : recordEncounterSkill(result, event, casualtyIds);
}
