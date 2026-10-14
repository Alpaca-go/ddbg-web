import { distance, rejectBattleCommand, skillTargetView, writeResolution } from "./battle";
import type { BattleEntity } from "./battle";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { multiTargetHealthEffects, projectActorWounds } from "./skill-actor-health";
import type { ApplyResult, GameState, MonsterSkillTargetsResolvedEvent } from "./command";
import { newlyDefeatedIds, nextBattleRoll, recordMonsterSkill } from "./encounter";
import {
  needsMonsterSkillShuffleChoice,
  resolveMonsterSkillEffects,
  readMonsterAttackView,
} from "./monster-skill";
import type { ShuffleIntent } from "./shuffle";
import type { MonsterCardView, MonsterCombatState } from "./monster-skill";
import type { PlayMonsterSkillCommand } from "./battle-monster";
import { beginSkillOwnEffects, afterMonsterOwnCombat } from "./battle-own-effects";
import type { SkillPrefix } from "./battle-own-effects";

const stances = ["aggressive", "defensive", "ranged", "support"];

/** R19、R24：AI 先选区域，再按 Guard / 姿态挑英雄，共用一个技能骰。 */
export function playMonsterSkillTargets(
  state: GameState,
  command: PlayMonsterSkillCommand,
  actor: BattleEntity,
  primary: BattleEntity,
  card: MonsterCardView,
  max: number,
  resume?: SkillPrefix,
): ApplyResult {
  const battle = resume?.original ?? state.battle!;
  const attack = readMonsterAttackView(card, command.skillSlot);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const candidates = battle.entities.filter(
    (e) => e.side === "hero" && !e.dead && e.areaId === primary.areaId,
  );
  if (candidates.some((e) => !e.stance || !stances.includes(e.stance)))
    return rejectBattleCommand(state, "多目标排序缺少已核实姿态（R19、R-048）");
  const targets = [...candidates]
    .sort(
      (a, b) =>
        Number(b.guard) - Number(a.guard) ||
        stances.indexOf(a.stance!) - stances.indexOf(b.stance!),
    )
    .slice(0, max);
  const steps = distance(battle.areas, actor.areaId, primary.areaId);
  if (steps === null) return rejectBattleCommand(state, "英雄目标区域不可达");
  const heights = { low: 0, normal: 1, high: 2 };
  const ids = new Set(targets.map((e) => e.id));
  const neighbors = candidates
    .filter((e) => !ids.has(e.id))
    .map((e) => ({ ...e, stress: e.stress! }));
  let contexts: MonsterCombatState[] = targets.map((target) => ({
    actor: {
      id: actor.id,
      wounds: actor.wounds,
      ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
      ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
    },
    target: skillTargetView(target),
    areaDistance: steps,
    light: battle.light,
    targetsInArea: targets.length,
    targetAreaLower:
      heights[battle.areas.find((a) => a.id === actor.areaId)!.elevation] >
      heights[battle.areas.find((a) => a.id === primary.areaId)!.elevation],
    guardedHeroOmitted:
      !targets.some((e) => e.guard) &&
      battle.entities.some((e) => e.side === "hero" && !e.dead && e.guard),
    untargetedHeroesBesideTarget: neighbors,
    ...((command.shuffleChoices?.[target.id] ?? command.shuffleChoice) === undefined
      ? {}
      : { shuffleChoice: command.shuffleChoices?.[target.id] ?? command.shuffleChoice }),
  }));
  const missingChoice = needsMonsterSkillShuffleChoice(card, command.skillSlot)
    ? contexts.find((c) => c.shuffleChoice === undefined)
    : undefined;
  const resolve = (roll: number, probe = false) =>
    contexts.map((c) =>
      resolveMonsterSkillEffects(
        card,
        command.skillSlot,
        {
          ...c,
          ...(probe && c.shuffleChoice === undefined ? { shuffleChoice: "push" as const } : {}),
        },
        roll,
      ),
    );
  const invalid = (effects: ReturnType<typeof resolve>) =>
    effects.find(
      (e) => e.status === "refused" || (e.status === "resolved" && e.resolution.skipped.length > 0),
    );
  const probes = resolve(1, true);
  const probe = invalid(probes);
  if (probe)
    return rejectBattleCommand(
      state,
      probe.status === "refused" ? probe.reason : "多目标未知效果尚未接入，整次拒绝（R-048）",
    );
  const statusProbe = applyBattleSkillStatuses(
    battle,
    battle.entities,
    actor.id,
    probes.flatMap((e) =>
      e.status === "resolved"
        ? [
            {
              ...e.resolution,
              targetStatusEffects:
                attack.view.verified_status_effects?.filter((s) => s.scope === "target") ??
                e.resolution.targetStatusEffects ??
                [],
            },
          ]
        : [],
    ),
  );
  if (statusProbe.status === "refused") return rejectBattleCommand(state, statusProbe.reason);
  if (missingChoice) {
    const choice = {
      id: `monster-targets-shuffle:${battle.choiceCursor}:${missingChoice.target.id}`,
      actorId: missingChoice.target.id,
      prompt: "为这名英雄选择怪物技能的位移方向",
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
          pending: {
            type: "shuffleDirection",
            choice,
            command,
            shuffleTargetId: missingChoice.target.id,
          },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const roll = resume ? resume.roll! : nextBattleRoll(state.seed, battle.rngCursor);
  const current = resume ? state.battle! : battle;
  if (resume)
    contexts = contexts.map((context) =>
      afterMonsterOwnCombat(
        context,
        current,
        targets.map((target) => target.id),
      ),
    );
  const effects = resolve(roll);
  const failure = invalid(effects);
  if (failure)
    return rejectBattleCommand(
      state,
      failure.status === "refused" ? failure.reason : "多目标效果不完整，整次拒绝（R-048）",
    );
  const results = effects.filter((e) => e.status === "resolved");
  if (!resume) {
    const own = beginSkillOwnEffects(state, command, roll, results[0]!, results);
    if (own) return own;
  }
  const resolutions = results.map((e) => e.resolution);
  const representative = resolutions.find((r) => r.outcome === "crit") ?? resolutions[0]!;
  const healthEffects = multiTargetHealthEffects(results);
  const actorWounds = projectActorWounds(
    actor.id,
    current.entities.find((entry) => entry.id === actor.id)!.wounds,
    healthEffects,
  );
  const actorDead = actorWounds >= card.life;
  const entities = current.entities.map((entity) => {
    const resolution = resolutions.find((r) => r.targetId === entity.id) ?? representative;
    const updated = writeResolution(
      entity,
      actor.id,
      resolution.targetId,
      { ...resolution, actorWounds },
      false,
    );
    return entity.id === actor.id ? { ...updated, dead: actorDead } : updated;
  });
  const health = applySkillHealth(
    current,
    entities,
    {
      resolution: representative,
      healthEffects,
    },
    state.seed,
    current.rngCursor + Number(!resume),
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const statuses = applyBattleSkillStatuses(
    current,
    health.entities,
    actor.id,
    resolutions,
    state.seed,
    health.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const event: MonsterSkillTargetsResolvedEvent = {
    ...(resume?.announced ? { phase: "afterOwn" as const } : {}),
    type: "monsterSkillTargetsResolved",
    message: "怪物多目标攻击已共用一次掷骰结算",
    actorId: actor.id,
    skillSlot: command.skillSlot,
    roll,
    actorDead,
    resolutions,
  };
  const intents: ShuffleIntent[] = [];
  if (representative.actorShuffle)
    intents.push({
      entityId: actor.id,
      relativeToId: primary.id,
      move: representative.actorShuffle,
    });
  for (const r of resolutions)
    if (r.targetShuffle)
      intents.push({ entityId: r.targetId, relativeToId: actor.id, move: r.targetShuffle });
  const casualtyIds = newlyDefeatedIds(battle, statuses.entities);
  const continuation = {
    ...event,
    type: "monsterSkillResolved" as const,
    resolution: representative,
    casualtyIds,
    targetIds: targets.map((e) => e.id),
    shuffleChooserId: primary.id,
    ...(resolutions.some((r) => r.outcome === "crit")
      ? { criticalContext: { combat: contexts[0]!, combats: contexts, entities: current.entities } }
      : {}),
  };
  const applied = {
    state: {
      ...state,
      battle: {
        ...current,
        monsterAction: null,
        pending: null,
        entities: statuses.entities,
        light: statuses.light,
        rngCursor: statuses.rngCursor,
        shuffleIntents: intents,
        shuffleContinuation: intents.length ? continuation : null,
      },
    },
    events: [event, ...health.events, ...statuses.events],
  };
  return intents.length ? applied : recordMonsterSkill(applied, continuation, casualtyIds);
}
