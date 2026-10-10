import { distance, rejectBattleCommand, skillTargetView, writeResolution } from "./battle";
import { applySkillHealth } from "./battle-health";
import { multiTargetHealthEffects, projectActorWounds } from "./skill-actor-health";
import {
  encounterSkillProblem,
  newlyDefeatedIds,
  nextBattleRoll,
  recordEncounterSkill,
} from "./encounter";
import { resolveHeroSkillEffects } from "./hero-skill";
import type { SkillCombatState } from "./hero-skill";
import type { ApplyResult, GameState, HeroSkillTargetsResolvedEvent } from "./command";

export type PlayHeroSkillTargetsCommand = {
  readonly type: "playHeroSkillTargets";
  readonly actorId: string;
  readonly skillId: string;
  readonly targetIds: readonly string[];
};

/** R19–21：一次技能、同区目标、一个骰面；反击逐目标累计。 */
export function playHeroSkillTargets(
  state: GameState,
  command: PlayHeroSkillTargetsCommand,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const problem = encounterSkillProblem(battle, command.actorId, command.skillId);
  if (problem) return rejectBattleCommand(state, problem);
  const actor = battle.entities.find((e) => e.id === command.actorId);
  const skill = battle.skills.find((s) => s.id === command.skillId);
  if (
    !actor ||
    actor.dead ||
    actor.side !== "hero" ||
    !skill ||
    !actor.skillIds.includes(skill.id) ||
    (skill.hero !== null && skill.hero !== actor.hero)
  )
    return rejectBattleCommand(state, "使用者或装备技能不可用");
  const ids = new Set(command.targetIds);
  const targets = command.targetIds.map((id) => battle.entities.find((e) => e.id === id));
  if (!targets.length || ids.size !== targets.length || targets.some((e) => !e || e.dead))
    return rejectBattleCommand(state, "须选择非空、不重复且存活的目标（R19）");
  const living = targets.filter((e) => e !== undefined);
  const targetArea = battle.areas.find((a) => a.id === living[0]!.areaId);
  const actorArea = battle.areas.find((a) => a.id === actor.areaId)!;
  const areaDistance = distance(battle.areas, actor.areaId, living[0]!.areaId);
  if (!targetArea || areaDistance === null || living.some((e) => e.areaId !== targetArea.id))
    return rejectBattleCommand(state, "目标须在同一个可达区域（R19）");
  const heights = { low: 0, normal: 1, high: 2 };
  const guardedEnemyOmitted =
    !living.some((e) => e.side === "monster" && e.guard) &&
    battle.entities.some((e) => e.side === "monster" && !e.dead && e.guard);
  const contexts: SkillCombatState[] = living.map((target) => ({
    actor,
    target: skillTargetView(target),
    light: battle.light,
    areaDistance,
    targetsInArea: living.length,
    targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
    targetInActorArea: target.side === "hero" && target.areaId === actor.areaId,
    guardedEnemyOmitted,
    heroesBesideActor: battle.entities
      .filter(
        (e) =>
          e.side === "hero" &&
          !e.dead &&
          e.areaId === actor.areaId &&
          e.id !== actor.id &&
          !ids.has(e.id),
      )
      .map((e) => ({ id: e.id, stress: e.stress! })),
  }));
  const resolve = (roll: number) =>
    contexts.map((context) => resolveHeroSkillEffects(skill, context, roll));
  const unsupported = (effects: ReturnType<typeof resolve>) =>
    effects.find(
      ({ resolution: r }) =>
        r.status === "refused" ||
        r.actorShuffle ||
        r.targetShuffle ||
        r.skipped.some((s) => s.code === "effect_lines") ||
        (r.effect === "damage" && living.find((e) => e.id === r.targetId)!.side === "hero"),
    );
  // 在消费 RNG 前预校验；未知效果或 duration 不能变成一次部分成功的攻击。
  const probes = resolve(1);
  const invalid = unsupported(probes);
  if (invalid)
    return rejectBattleCommand(
      state,
      invalid.resolution.reason ?? "多目标位移或未完整支持的效果，整次拒绝（R-048）",
    );
  const roll =
    probes[0]!.resolution.outcome === null ? null : nextBattleRoll(state.seed, battle.rngCursor);
  const effects = roll === null ? probes : resolve(roll);
  const failed = unsupported(effects);
  if (failed)
    return rejectBattleCommand(
      state,
      failed.resolution.reason ?? "多目标效果未完整支持，整次拒绝（R-048）",
    );
  const resolutions = effects.map((e) => e.resolution);
  const actorResult = resolutions.find((r) => r.outcome === "crit") ?? resolutions[0]!;
  const healthEffects = multiTargetHealthEffects(effects);
  const actorWounds = projectActorWounds(actor.id, actor.wounds, healthEffects);
  const entities = battle.entities.map((entity) => {
    const targetResult = resolutions.find((r) => r.targetId === entity.id);
    const resolution = targetResult
      ? {
          ...targetResult,
          actorStress: actorResult.actorStress,
          actorWounds,
          // 其他目标打出暴击，也为与使用者同区的已选友方减压一次。
          targetStress:
            actorResult.outcome === "crit" &&
            targetResult.outcome !== "crit" &&
            entity.id !== actor.id &&
            entity.areaId === actor.areaId &&
            targetResult.targetStress !== null
              ? Math.max(0, targetResult.targetStress - 1)
              : targetResult.targetStress,
        }
      : { ...actorResult, actorWounds };
    return writeResolution(entity, actor.id, resolution.targetId, resolution, false);
  });
  const health = applySkillHealth(
    battle,
    entities,
    {
      resolution: actorResult,
      healthEffects,
    },
    state.seed,
    battle.rngCursor + (roll === null ? 0 : 1),
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const event: HeroSkillTargetsResolvedEvent = {
    type: "heroSkillTargetsResolved",
    message: "英雄多目标技能已共用一次掷骰结算",
    actorId: actor.id,
    roll,
    resolutions,
  };
  const result: ApplyResult = {
    state: {
      ...state,
      battle: { ...battle, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: [event, ...health.events],
  };
  // 复用一次技能的回合收尾；任一目标成功就锁定重用，全部落空才允许再用。
  const success = resolutions.find((r) => r.outcome !== "miss") ?? resolutions[0]!;
  return recordEncounterSkill(
    result,
    {
      type: "heroSkillResolved",
      message: event.message,
      actorId: actor.id,
      roll,
      resolution: success,
    },
    newlyDefeatedIds(battle, health.entities),
  );
}
