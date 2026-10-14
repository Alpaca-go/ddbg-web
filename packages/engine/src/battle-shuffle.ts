import { rejectBattleCommand, resolveSkillStress } from "./battle";
import type { ApplyResult, GameEvent, GameState, PendingChoice } from "./command";
import { recordEncounterSkill, recordMonsterSkill } from "./encounter";
import { resolveShuffle } from "./shuffle";
import { heroSkillUsesSelfTarget, resolveHeroSkillEffects } from "./hero-skill";
import type { HeroSkillResolution } from "./hero-skill";
import { resolveMonsterSkillEffects } from "./monster-skill";
import { triggerBattlePassive } from "./battle-passive";
import { applySkillHealth } from "./battle-health";
import { newlyDefeatedIds } from "./encounter";
import { hasQuirk } from "./passive";
import type { SkillHealthEffect } from "./hero-skill";
import { correctMultiTargetStress } from "./battle-multi-crit";
import { ancestorGlory, clearAncestorConditions } from "./battle-ancestor";
import { resumeSkillOwnEffects } from "./battle-own-effects";

/** R27：持有 Balanced 的英雄决定是否少移 1；不改变原技能骰或其他位移意图。 */
export function chooseBalancedShuffle(state: GameState, optionId: string): ApplyResult {
  const b = state.battle;
  const intent = b?.shuffleIntents[0];
  const hero = b?.entities.find((e) => e.id === intent?.entityId);
  if (
    !b ||
    b.pending?.type !== "shuffleReduction" ||
    !intent ||
    !hero ||
    hero.side !== "hero" ||
    !hasQuirk(hero, "Balanced") ||
    intent.balancedChosen ||
    !Number.isSafeInteger(intent.move.distance) ||
    intent.move.distance <= 0 ||
    !["keep", "reduce"].includes(optionId)
  )
    return rejectBattleCommand(state, "Balanced 位移选择已过期或距离无效");
  const result = applyBattleShuffles({
    ...state,
    battle: {
      ...b,
      pending: null,
      shuffleIntents: [
        {
          ...intent,
          balancedChosen: true,
          move: {
            ...intent.move,
            distance: intent.move.distance - Number(optionId === "reduce"),
          },
        },
        ...b.shuffleIntents.slice(1),
      ],
    },
  });
  return {
    ...result,
    events: [
      {
        type: "passiveTriggered",
        entityId: hero.id,
        trigger: "balancedChoice",
        message: `Balanced：${optionId === "reduce" ? "位移少移 1" : "保持位移距离"}（R27）`,
      },
      ...result.events,
    ],
  };
}

/** R20–21、R-020：逐条应用自身 / 目标位移；选择不重掷技能骰。 */
export function applyBattleShuffles(state: GameState, path: readonly string[] = []): ApplyResult {
  const battle = state.battle;
  const continuation = battle?.shuffleContinuation;
  if (!battle || !continuation || battle.shuffleIntents.length === 0)
    return rejectBattleCommand(state, "没有待结算的技能位移");
  let next = battle;
  let choices = path;
  const events: GameEvent[] = [];
  while (next.shuffleIntents.length) {
    const intent = next.shuffleIntents[0]!;
    const entity = next.entities.find((entry) => entry.id === intent.entityId);
    // R20自身效果无视免疫；目标Shuffle在当前A4被免疫，不触发位移被动。
    if (entity && intent.entityId !== continuation.actorId && ancestorGlory(next.areas, entity)) {
      next = { ...next, shuffleIntents: next.shuffleIntents.slice(1) };
      choices = [];
      events.push({
        type: "passiveTriggered",
        entityId: entity.id,
        trigger: "ancestorGlory",
        message: `${entity.id} Ancestor's Glory：免疫目标Shuffle（R-065/067、R20）`,
      });
      continue;
    }
    // 被技能伤害杀死的目标已移除棋子（R24–25），不再执行目标位移。
    if (entity?.dead && intent.entityId !== continuation.actorId) {
      next = { ...next, shuffleIntents: next.shuffleIntents.slice(1) };
      choices = [];
      continue;
    }
    if (
      entity?.side === "hero" &&
      hasQuirk(entity, "Balanced") &&
      !intent.balancedChosen &&
      Number.isSafeInteger(intent.move.distance) &&
      intent.move.distance > 0
    ) {
      const choice: PendingChoice = {
        id: `shuffle-reduction:${next.choiceCursor}:${entity.id}`,
        actorId: entity.id,
        prompt: `${entity.id} · Balanced：是否将本次区域与姿态位移各减少 1？（R27）`,
        options: [
          { id: "keep", label: `保持位移 ${intent.move.distance}` },
          { id: "reduce", label: `位移少移 1（${intent.move.distance - 1}）` },
        ],
      };
      return {
        state: {
          ...state,
          battle: {
            ...next,
            choiceCursor: next.choiceCursor + 1,
            pending: { type: "shuffleReduction", choice },
          },
        },
        events,
        pendingChoice: choice,
      };
    }
    // 自身效果先于伤害（R20），其落点容量仍计入随后死亡的目标。
    const selfBeforeDeath = intent.entityId === continuation.actorId;
    const result = resolveShuffle(
      selfBeforeDeath
        ? {
            ...next,
            entities: next.entities.map((entry) =>
              entry.id === intent.relativeToId ||
              entry.id === intent.entityId ||
              continuation.targetIds?.includes(entry.id)
                ? { ...entry, dead: false }
                : entry,
            ),
          }
        : next,
      intent,
      choices,
    );
    if (result.status === "refused") return rejectBattleCommand(state, result.reason);
    if (result.status === "needsChoice") {
      const choice: PendingChoice = {
        id: `shuffle-area:${next.choiceCursor}:${intent.entityId}`,
        prompt: "选择位移的下一步区域",
        actorId:
          continuation.type === "heroSkillResolved" ||
          continuation.type === "heroSkillEmptyAreaResolved"
            ? continuation.actorId
            : intent.entityId === continuation.actorId
              ? (continuation.shuffleChooserId ?? continuation.resolution.targetId)
              : intent.entityId,
        options: result.options.map((id) => ({ id, label: `区域 ${id}` })),
      };
      return {
        state: {
          ...state,
          battle: {
            ...next,
            choiceCursor: next.choiceCursor + 1,
            pending: { type: "shuffleArea", choice, path: result.path },
          },
        },
        events,
        pendingChoice: choice,
      };
    }
    next = {
      ...next,
      entities: selfBeforeDeath
        ? result.entities.map((entry) =>
            entry.id === intent.relativeToId ||
            entry.id === intent.entityId ||
            continuation.targetIds?.includes(entry.id)
              ? { ...entry, dead: next.entities.find((before) => before.id === entry.id)!.dead }
              : entry,
          )
        : result.entities,
      shuffleIntents: next.shuffleIntents.slice(1),
      pending: null,
      shufflePassiveIds: [
        ...(next.shufflePassiveIds ?? []),
        ...(entity?.side === "hero" && (result.path.length > 0 || result.stanceSteps > 0)
          ? [entity.id]
          : []),
      ],
    };
    events.push({
      type: "shuffleResolved",
      message: "区域与姿态位移已结算",
      entityId: intent.entityId,
      path: result.path,
      stanceSteps: result.stanceSteps,
    });
    next = { ...next, entities: clearAncestorConditions(next.areas, next.entities) };
    choices = [];
  }
  if (next.skillPrefix) {
    const passive = triggerBattlePassive(
      next,
      state.seed,
      next.shufflePassiveIds ?? [],
      "shuffled",
    );
    if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
    return resumeSkillOwnEffects({
      state: { ...state, battle: { ...passive.battle, shufflePassiveIds: [] } },
      events: [...events, ...passive.events],
    });
  }
  if (continuation.type === "heroSkillEmptyAreaResolved") {
    const passive = triggerBattlePassive(
      next,
      state.seed,
      next.shufflePassiveIds ?? [],
      "shuffled",
    );
    if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
    next = { ...passive.battle, shufflePassiveIds: [] };
    events.push(...passive.events);
    return recordEncounterSkill(
      {
        state: { ...state, battle: { ...next, pending: null, shuffleContinuation: null } },
        events,
      },
      continuation,
      [...(continuation.casualtyIds ?? []), ...newlyDefeatedIds(battle, next.entities)],
    );
  }
  let deferred: readonly SkillHealthEffect[] = [];
  if (continuation.criticalContext?.combats) {
    const corrected = correctMultiTargetStress(next, continuation);
    if (corrected.status === "refused") return rejectBattleCommand(state, corrected.reason);
    next = { ...next, entities: corrected.entities };
    deferred = corrected.deferredHealthEffects;
    events.push({
      type:
        continuation.type === "heroSkillResolved"
          ? "heroCritAreaResolved"
          : "monsterCritAreaResolved",
      message: "按多目标位移后的区域去重结算暴击压力",
      actorId: continuation.actorId,
    });
  } else if (continuation.criticalContext) {
    const { entities: original } = continuation.criticalContext;
    const actor = next.entities.find((entry) => entry.id === continuation.actorId)!;
    const target = next.entities.find((entry) => entry.id === continuation.resolution.targetId)!;
    const nearby = (areaId: string) =>
      next.entities
        .filter(
          (entry) =>
            entry.side === "hero" &&
            !entry.dead &&
            entry.areaId === areaId &&
            entry.id !== actor.id &&
            entry.id !== target.id,
        )
        .map((entry) => ({
          id: entry.id,
          stress: original.find((before) => before.id === entry.id)!.stress!,
        }));
    let corrected: HeroSkillResolution;
    let selfTarget = false;
    if (continuation.type === "heroSkillResolved") {
      const combat = continuation.criticalContext!.combat;
      const skill = next.skills.find((entry) => entry.id === continuation.resolution.skillId)!;
      selfTarget = heroSkillUsesSelfTarget(skill, combat.face);
      const effects = resolveHeroSkillEffects(
        skill,
        {
          ...combat,
          heroesBesideActor: nearby(actor.areaId),
          untargetedHeroesBesideTarget: actor.areaId === target.areaId ? [] : nearby(target.areaId),
          targetInActorArea: target.side === "hero" && actor.areaId === target.areaId,
        },
        continuation.roll!,
      );
      corrected = effects.resolution;
      deferred = effects.healthEffects.filter((e) => e.deferred);
    } else {
      const card = next.monsters!.find((entry) => entry.id === actor.monsterCardId)!;
      const result = resolveMonsterSkillEffects(
        card,
        continuation.skillSlot,
        {
          ...continuation.criticalContext!.combat,
          untargetedHeroesBesideTarget: nearby(target.areaId),
        },
        continuation.roll,
      );
      if (result.status === "refused") return rejectBattleCommand(state, result.reason);
      corrected = result.resolution;
      deferred = result.healthEffects.filter((e) => e.deferred);
    }
    if (corrected.status === "refused") return rejectBattleCommand(state, corrected.reason!);
    next = {
      ...next,
      entities: next.entities.map((entry) => {
        const baseline = original.find((before) => before.id === entry.id)!;
        const stress = resolveSkillStress(baseline, actor.id, target.id, corrected, selfTarget);
        return stress === undefined ? entry : { ...entry, stress };
      }),
      shuffleContinuation: {
        ...continuation,
        resolution: {
          ...continuation.resolution,
          actorStress: corrected.actorStress,
          targetStress: corrected.targetStress,
          besideActorStress: corrected.besideActorStress,
          untargetedBesideTargetStress: corrected.untargetedBesideTargetStress,
        },
      },
    };
    events.push({
      type:
        continuation.type === "heroSkillResolved"
          ? "heroCritAreaResolved"
          : "monsterCritAreaResolved",
      message: "按位移后的区域结算暴击压力",
      actorId: actor.id,
    });
  }
  if (deferred.length) {
    const health = applySkillHealth(
      next,
      next.entities,
      {
        resolution: continuation.resolution,
        healthEffects: deferred.map((e) => ({ ...e, deferred: false })),
      },
      state.seed,
      next.rngCursor,
    );
    if (health.status === "refused") return rejectBattleCommand(state, health.reason);
    next = { ...next, entities: health.entities, rngCursor: health.rngCursor };
    events.push(...health.events);
  }
  const passive = triggerBattlePassive(next, state.seed, next.shufflePassiveIds ?? [], "shuffled");
  if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
  next = { ...passive.battle, shufflePassiveIds: [] };
  events.push(...passive.events);
  const final = {
    state: { ...state, battle: { ...next, pending: null, shuffleContinuation: null } },
    events,
  };
  const completed = next.shuffleContinuation ?? continuation;
  return completed.type === "heroSkillResolved" || completed.type === "heroSkillEmptyAreaResolved"
    ? recordEncounterSkill(final, completed, [
        ...(completed.casualtyIds ?? []),
        ...newlyDefeatedIds(battle, next.entities),
      ])
    : recordMonsterSkill(final, completed, [
        ...(completed.casualtyIds ?? []),
        ...newlyDefeatedIds(battle, next.entities),
      ]);
}
