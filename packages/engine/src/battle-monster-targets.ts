import { distance, rejectBattleCommand, skillTargetView, writeResolution } from "./battle";
import type { BattleEntity } from "./battle";
import { applySkillHealth } from "./battle-health";
import { multiTargetHealthEffects, projectActorWounds } from "./skill-actor-health";
import type { ApplyResult, GameState, MonsterSkillTargetsResolvedEvent } from "./command";
import { newlyDefeatedIds, nextBattleRoll, recordMonsterSkill } from "./encounter";
import { resolveMonsterSkillEffects } from "./monster-skill";
import type { MonsterCardView, MonsterCombatState } from "./monster-skill";
import type { PlayMonsterSkillCommand } from "./battle-monster";

const stances = ["aggressive", "defensive", "ranged", "support"];

/** R19、R24：AI 先选区域，再按 Guard / 姿态挑英雄，共用一个技能骰。 */
export function playMonsterSkillTargets(
  state: GameState,
  command: PlayMonsterSkillCommand,
  actor: BattleEntity,
  primary: BattleEntity,
  card: MonsterCardView,
  max: number,
): ApplyResult {
  const battle = state.battle!;
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
    .map((e) => ({ id: e.id, stress: e.stress! }));
  const contexts: MonsterCombatState[] = targets.map((target) => ({
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
  }));
  const resolve = (roll: number) =>
    contexts.map((c) => resolveMonsterSkillEffects(card, command.skillSlot, c, roll));
  const invalid = (effects: ReturnType<typeof resolve>) =>
    effects.find(
      (e) =>
        e.status === "refused" ||
        (e.status === "resolved" &&
          (e.resolution.actorShuffle ||
            e.resolution.targetShuffle ||
            e.resolution.skipped.length > 0)),
    );
  const probe = invalid(resolve(1));
  if (probe)
    return rejectBattleCommand(
      state,
      probe.status === "refused" ? probe.reason : "多目标位移或未知效果尚未接入，整次拒绝（R-048）",
    );
  const roll = nextBattleRoll(state.seed, battle.rngCursor);
  const effects = resolve(roll);
  const failure = invalid(effects);
  if (failure)
    return rejectBattleCommand(
      state,
      failure.status === "refused" ? failure.reason : "多目标效果不完整，整次拒绝（R-048）",
    );
  const results = effects.filter((e) => e.status === "resolved");
  const resolutions = results.map((e) => e.resolution);
  const representative = resolutions.find((r) => r.outcome === "crit") ?? resolutions[0]!;
  const healthEffects = multiTargetHealthEffects(results);
  const actorWounds = projectActorWounds(actor.id, actor.wounds, healthEffects);
  const actorDead = actorWounds >= card.life;
  const entities = battle.entities.map((entity) => {
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
    battle,
    entities,
    {
      resolution: representative,
      healthEffects,
    },
    state.seed,
    battle.rngCursor + 1,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const event: MonsterSkillTargetsResolvedEvent = {
    type: "monsterSkillTargetsResolved",
    message: "怪物多目标攻击已共用一次掷骰结算",
    actorId: actor.id,
    skillSlot: command.skillSlot,
    roll,
    actorDead,
    resolutions,
  };
  return recordMonsterSkill(
    {
      state: {
        ...state,
        battle: {
          ...battle,
          monsterAction: null,
          entities: health.entities,
          rngCursor: health.rngCursor,
        },
      },
      events: [event, ...health.events],
    },
    { ...event, type: "monsterSkillResolved", resolution: representative },
    newlyDefeatedIds(battle, health.entities),
  );
}
