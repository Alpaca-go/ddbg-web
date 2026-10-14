import { playHeroSkill, rejectBattleCommand, writeResolution } from "./battle";
import type { BattleState, PlayHeroSkillCommand } from "./battle";
import { playHeroSkillTargets } from "./battle-hero-targets";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { ApplyResult, GameState } from "./command";
import type { SkillCombatState, SkillEffectsResolution } from "./hero-skill";
import { heroSkillUsesSelfTarget } from "./hero-skill";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { cancelSkillAfterRoll } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";
import { applyBattleShuffles } from "./battle-shuffle";

/** R20：声明快照只保留一次；后续命令沿用骰面，当前实体保留已支付效果。 */
export type HeroSkillPrefix = {
  readonly original: BattleState;
  readonly command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
  readonly roll: number | null;
  readonly announced?: true;
};

/** 命中阈值仍用声明时的姿态／Buff／光照；生命和暴击同区名单用自身结算后状态。 */
export function afterHeroOwnCombat(
  combat: SkillCombatState,
  current: BattleState,
): SkillCombatState {
  const actor = current.entities.find((entry) => entry.id === combat.actor?.id)!;
  const target = current.entities.find((entry) => entry.id === combat.target.id)!;
  const nearby = (areaId: string) =>
    current.entities
      .filter(
        (entry) =>
          entry.side === "hero" &&
          !entry.dead &&
          entry.areaId === areaId &&
          entry.id !== actor.id &&
          entry.id !== target.id,
      )
      .map((entry) => ({ ...entry, stress: entry.stress! }));
  return {
    ...combat,
    ownEffectsApplied: true,
    effectLight: current.light,
    actor: {
      ...combat.actor!,
      wounds: actor.wounds,
      ...(actor.stress === undefined ? {} : { stress: actor.stress }),
    },
    target: {
      ...combat.target,
      wounds: target.wounds,
      ...(target.stress === undefined ? {} : { stress: target.stress }),
    },
    heroesBesideActor: nearby(actor.areaId),
    untargetedHeroesBesideTarget: actor.areaId === target.areaId ? [] : nearby(target.areaId),
    targetInActorArea: target.side === "hero" && actor.areaId === target.areaId,
  };
}

export function beginHeroOwnEffects(
  state: GameState,
  command: HeroSkillPrefix["command"],
  roll: number | null,
  effects: SkillEffectsResolution,
  allEffects: readonly SkillEffectsResolution[] = [effects],
): ApplyResult | null {
  const battle = state.battle!;
  const actor = battle.entities.find((entry) => entry.id === command.actorId)!;
  const skill = battle.skills.find((entry) => entry.id === command.skillId)!;
  const own = effects.own;
  const resolution = effects.resolution;
  if (
    !own ||
    heroSkillUsesSelfTarget(skill, command.type === "playHeroSkill" ? command.face : undefined)
  )
    return null;
  const r = own.resolution;
  if (
    !resolution.actorShuffle &&
    !own.healthEffects.length &&
    (r.actorStress ?? actor.stress) === actor.stress &&
    !r.actorBleedCleared &&
    !r.actorBlightCleared &&
    !r.actorStatusEffects?.length &&
    !r.actorLightDelta &&
    r.actorForm === null
  )
    return null;
  const health = applySkillHealth(
    battle,
    battle.entities,
    own,
    state.seed,
    battle.rngCursor + Number(roll !== null),
    actor.id,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  let result: ApplyResult = {
    state: {
      ...state,
      battle: { ...battle, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: health.events,
  };
  if (health.entities.find((entry) => entry.id === actor.id)!.dead) {
    return cancelSkillAfterRoll(state, actor.id, health);
  }
  const projected = health.entities.map((entry) =>
    writeResolution(
      entry,
      actor.id,
      "",
      {
        ...r,
        actorWounds:
          actor.life === undefined
            ? r.actorWounds
            : health.entities.find((hero) => hero.id === actor.id)!.wounds,
      },
      false,
    ),
  );
  const statuses = applyBattleSkillStatuses(
    result.state.battle!,
    projected,
    actor.id,
    [r],
    state.seed,
    health.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const prefix: HeroSkillPrefix = {
    original: battle,
    command,
    roll,
    ...(resolution.actorShuffle ? { announced: true as const } : {}),
  };
  result = {
    state: {
      ...state,
      battle: {
        ...battle,
        entities: statuses.entities,
        light: statuses.light,
        rngCursor: statuses.rngCursor,
        skillPrefix: prefix,
        shuffleIntents: resolution.actorShuffle
          ? [
              {
                entityId: actor.id,
                relativeToId:
                  command.type === "playHeroSkill" ? command.targetId : command.targetIds[0]!,
                move: resolution.actorShuffle,
              },
            ]
          : [],
        shuffleContinuation: resolution.actorShuffle
          ? {
              type: "heroSkillResolved",
              actorId: actor.id,
              roll,
              resolution,
              message: "技能骰已确定，先结算自身位移；目标效果尚未提交",
            }
          : null,
      },
    },
    events: [
      ...(resolution.actorShuffle
        ? [
            command.type === "playHeroSkill"
              ? {
                  type: "heroSkillResolved" as const,
                  actorId: actor.id,
                  roll,
                  resolution,
                  phase: "ownPending" as const,
                  message: "技能骰已确定，先结算自身位移；目标效果尚未提交",
                }
              : {
                  type: "heroSkillTargetsResolved" as const,
                  actorId: actor.id,
                  roll,
                  resolutions: allEffects.map((effect) => effect.resolution),
                  phase: "ownPending" as const,
                  message: "技能骰已确定，先结算自身位移；全部目标效果尚未提交",
                },
          ]
        : []),
      ...health.events,
      ...statuses.events,
    ],
  };
  return resolution.actorShuffle ? result : resumeHeroOwnEffects(result);
}

export function resumeHeroOwnEffects(input: ApplyResult): ApplyResult {
  const prefix = input.state.battle?.skillPrefix;
  if (!prefix) return rejectBattleCommand(input.state, "缺少自身效果续接快照");
  const pressure = resolveBattlePressure(input);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const current = pressure.state.battle!;
  const state = {
    ...pressure.state,
    battle: { ...current, skillPrefix: null, shuffleContinuation: null, pending: null },
  };
  if (current.entities.find((entry) => entry.id === prefix.command.actorId)!.dead)
    return cancelSkillAfterRoll(
      state,
      prefix.command.actorId,
      {
        entities: current.entities,
        rngCursor: current.rngCursor,
        events: pressure.events,
      },
      prefix.original,
    );
  let completed =
    prefix.command.type === "playHeroSkill"
      ? playHeroSkill(state, prefix.command, prefix)
      : playHeroSkillTargets(state, prefix.command, prefix);
  if (
    completed.state.battle!.shuffleIntents.length &&
    !completed.pendingChoice &&
    !completed.events.some((event) => event.type === "commandRefused")
  ) {
    const moved = applyBattleShuffles(completed.state);
    completed = { ...moved, events: [...completed.events, ...moved.events] };
  }
  if (
    input.state.battle!.shuffleContinuation &&
    completed.events.some(
      (event) =>
        (event.type === "heroSkillResolved" && event.resolution.outcome === "crit") ||
        (event.type === "heroSkillTargetsResolved" &&
          event.resolutions.some((resolution) => resolution.outcome === "crit")),
    ) &&
    !completed.events.some((event) => event.type === "heroCritAreaResolved")
  )
    completed = {
      ...completed,
      events: [
        ...completed.events,
        {
          type: "heroCritAreaResolved",
          actorId: prefix.command.actorId,
          message: "按自身位移后的实际区域结算暴击压力",
        },
      ],
    };
  // 首项是结算摘要；生命／状态事件仍按自身在先、目标在后的顺序保留。
  if (input.state.battle!.shuffleContinuation)
    return { ...completed, events: [...pressure.events, ...completed.events] };
  const [summary, ...remaining] = completed.events;
  return {
    ...completed,
    events: summary ? [summary, ...pressure.events, ...remaining] : pressure.events,
  };
}
