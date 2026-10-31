import { beginDamageStoneWindow, damageStoneHealthEffects } from "./battle-damage-stone";
import { distance, rejectBattleCommand, skillTargetView, writeResolution } from "./battle";
import { healingForbidden } from "./battle-healing";
import { applySkillHealth } from "./battle-health";
import { cancelSkillAfterRoll } from "./battle-passive";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { multiTargetHealthEffects, projectActorWounds } from "./skill-actor-health";
import {
  encounterSkillProblem,
  newlyDefeatedIds,
  nextBattleRoll,
  recordEncounterSkill,
} from "./encounter";
import {
  needsHeroSkillShuffleChoice,
  resolveHeroSkillEffects,
  skillIgnoresGuard,
} from "./hero-skill";
import type { ShuffleIntent } from "./shuffle";
import type { SkillCombatState } from "./hero-skill";
import type { ApplyResult, GameState, HeroSkillTargetsResolvedEvent } from "./command";
import { beginSkillOwnEffects, afterHeroOwnCombat } from "./battle-own-effects";
import type { SkillPrefix } from "./battle-own-effects";
import { beforeTargetShuffle } from "./battle-target-pressure";
import { beginHeroTrinketWindow } from "./battle-trinket-ability";
import type { HeroTrinketAttack } from "./battle-trinket-ability";
import type { HeroSkillTrinketWindow } from "../../data/src/hero-skill-trinkets";
import { chainSwinePrinceIEnragedDestructionAfterHeroSkill } from "./boss/swine-prince-i-combat-runtime";
import { chainGestatingHeartIchorAfterHeroSkill } from "./boss/gestating-heart-ichor";

export type PlayHeroSkillTargetsCommand = {
  readonly damageStoneWindow?: true;
  readonly type: "playHeroSkillTargets";
  readonly trinketWindow?: HeroSkillTrinketWindow;
  readonly actorId: string;
  readonly skillId: string;
  readonly targetIds: readonly string[];
  readonly shuffleChoice?: "push" | "pull";
};

/** R19–21：一次技能、同区目标、一个骰面；反击逐目标累计。 */
export function playHeroSkillTargets(
  state: GameState,
  command: PlayHeroSkillTargetsCommand,
  resume?: SkillPrefix,
  trinketAttack?: HeroTrinketAttack,
): ApplyResult {
  const battle = resume?.original ?? state.battle;
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
  const guardedEnemyOmitted = skillIgnoresGuard(skill!)
    ? false
    : !living.some((e) => e.side === "monster" && e.guard) &&
      battle.entities.some((e) => e.side === "monster" && !e.dead && e.guard);
  let contexts: SkillCombatState[] = living.map((target) => ({
    ...(battle.trinketRuntime ? { trinketHealingMetadata: true as const } : {}),
    ...((resume?.trinketAttack ?? trinketAttack)
      ? { trinketModifiers: (resume?.trinketAttack ?? trinketAttack)!.modifiers }
      : {}),
    actor: actor.hero === "ABOMINATION" && !actor.form ? { ...actor, form: "human" } : actor,
    target: skillTargetView(target, battle),
    light: battle.light,
    areaDistance,
    targetsInArea: living.length,
    targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
    targetInActorArea: target.side === "hero" && target.areaId === actor.areaId,
    guardedEnemyOmitted,
    ...(command.shuffleChoice === undefined ? {} : { shuffleChoice: command.shuffleChoice }),
    heroesBesideActor: battle.entities
      .filter(
        (e) =>
          e.side === "hero" &&
          !e.dead &&
          e.areaId === actor.areaId &&
          e.id !== actor.id &&
          !ids.has(e.id),
      )
      .map((e) => ({ ...e, stress: e.stress! })),
  }));
  const needsChoice = command.shuffleChoice === undefined && needsHeroSkillShuffleChoice(skill);
  const resolve = (roll: number, probe = false) =>
    contexts.map((context) =>
      resolveHeroSkillEffects(
        skill,
        { ...context, ...(probe && needsChoice ? { shuffleChoice: "push" as const } : {}) },
        roll,
      ),
    );
  const unsupported = (effects: ReturnType<typeof resolve>) =>
    effects.find(
      ({ resolution: r }) =>
        r.status === "refused" ||
        r.skipped.some((s) => s.code === "effect_lines") ||
        (r.effect === "damage" && living.find((e) => e.id === r.targetId)!.side === "hero"),
    );
  // 在消费 RNG 前预校验；未知效果或 duration 不能变成一次部分成功的攻击。
  const probes = resolve(1, true);
  const invalid = unsupported(probes);
  if (invalid)
    return rejectBattleCommand(
      state,
      invalid.resolution.reason ?? "多目标未完整支持的效果，整次拒绝（R-048）",
    );
  if (
    probes.some((p) => p.resolution.effect === "heal") &&
    (healingForbidden(battle, actor.id) || living.some((t) => healingForbidden(battle, t.id)))
  )
    return rejectBattleCommand(state, "Unholy Aura：此区域英雄不能治疗或被治疗（R-067）");
  const statusProbe = applyBattleSkillStatuses(
    battle,
    battle.entities,
    actor.id,
    probes.map((entry) => entry.resolution),
  );
  if (statusProbe.status === "refused") return rejectBattleCommand(state, statusProbe.reason);
  if (needsChoice) {
    const choice = {
      id: `hero-targets-shuffle:${battle.choiceCursor}`,
      actorId: actor.id,
      prompt: "选择多目标技能的位移方向",
      options: [
        { id: "push", label: "推离 Push" },
        { id: "pull", label: "拉近 Pull" },
      ],
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "shuffleDirection", choice, command },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const roll = resume
    ? resume.roll
    : probes[0]!.resolution.outcome === null
      ? null
      : (trinketAttack?.roll ?? nextBattleRoll(state.seed, battle.rngCursor));
  const current = resume ? state.battle! : battle;
  if (resume)
    contexts = contexts.map((context) => afterHeroOwnCombat(context, current, command.targetIds));
  let effects = resolve(roll ?? 1);
  const failed = unsupported(effects);
  if (failed)
    return rejectBattleCommand(
      state,
      failed.resolution.reason ?? "多目标效果未完整支持，整次拒绝（R-048）",
    );
  if (trinketAttack?.preview)
    return {
      state,
      events: [
        {
          type: "heroSkillTargetsResolved",
          message: "饰品技能预览",
          actorId: actor.id,
          roll,
          resolutions: effects.map((e) => e.resolution),
        },
      ],
    };
  if (command.trinketWindow && !resume && !trinketAttack && roll !== null) {
    const window = beginHeroTrinketWindow(state, command, roll, skill, effects[0]!.resolution);
    if (window) return window;
  }
  if (!resume) {
    const own = beginSkillOwnEffects(state, command, roll, effects[0]!, effects, trinketAttack);
    if (own) return own;
  }
  if (current.trinketRuntime) {
    contexts = contexts.map((c) => ({ ...c, trinketScope: current }));
    effects = resolve(roll ?? 1);
  }
  const resolutions = effects.map((e) => e.resolution);
  const actorResult = resolutions.find((r) => r.outcome === "crit") ?? resolutions[0]!;
  const healthEffects = multiTargetHealthEffects(effects);
  // 支持卡可选择使用者自己；writeResolution 会合并目标治疗，不能先计入自身投影再减一次。
  const actorWounds = projectActorWounds(
    actor.id,
    current.entities.find((entry) => entry.id === actor.id)!.wounds,
    skill.verified_target_support
      ? healthEffects.filter((e) => e.source !== "targetHeal")
      : healthEffects,
  );
  const entities = current.entities.map((entity) => {
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
  const damageStoneWindow = beginDamageStoneWindow(
    state,
    command,
    roll,
    healthEffects,
    resume,
    trinketAttack,
  );
  if (damageStoneWindow) return damageStoneWindow;
  const health = applySkillHealth(
    current,
    entities,
    {
      resolution: actorResult,
      healthEffects: damageStoneHealthEffects(resume, healthEffects),
    },
    state.seed,
    current.rngCursor + (resume || roll === null ? 0 : 1),
    actor.id,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  if (health.cancelled) return cancelSkillAfterRoll(state, actor.id, health);
  const pressure = beforeTargetShuffle(state, current, health, resolutions);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const statuses = applyBattleSkillStatuses(
    pressure.state.battle!,
    pressure.state.battle!.entities,
    actor.id,
    resolutions,
    state.seed,
    pressure.state.battle!.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const event: HeroSkillTargetsResolvedEvent = {
    ...(resume?.announced ? { phase: "afterOwn" as const } : {}),
    type: "heroSkillTargetsResolved",
    message: "英雄多目标技能已共用一次掷骰结算",
    actorId: actor.id,
    roll,
    resolutions,
  };
  const success = resolutions.find((r) => r.outcome !== "miss") ?? resolutions[0]!;
  const continuation = {
    type: "heroSkillResolved" as const,
    message: event.message,
    actorId: actor.id,
    roll,
    resolution: success,
    targetIds: living.map((e) => e.id),
    casualtyIds: newlyDefeatedIds(battle, statuses.entities),
  };
  const intents: ShuffleIntent[] = [];
  if (actorResult.actorShuffle)
    intents.push({
      entityId: actor.id,
      relativeToId: living[0]!.id,
      move: actorResult.actorShuffle,
    });
  for (const r of resolutions)
    if (r.targetShuffle)
      intents.push({ entityId: r.targetId, relativeToId: actor.id, move: r.targetShuffle });
  const result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...pressure.state.battle!,
        pending: null,
        entities: statuses.entities,
        light: statuses.light,
        rngCursor: statuses.rngCursor,
        shuffleIntents: intents,
        shuffleContinuation: intents.length ? continuation : null,
      },
    },
    events: [event, ...pressure.events, ...statuses.events],
  };
  const chained = chainGestatingHeartIchorAfterHeroSkill(
    chainSwinePrinceIEnragedDestructionAfterHeroSkill(result, battle.entities, actor.id),
    battle.entities,
    actor.id,
  );
  return intents.length
    ? chained
    : recordEncounterSkill(
        chained,
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
