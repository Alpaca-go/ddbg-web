import { isPyreCard, playPyreSkill } from "./boss/pyre-skill";
import { isCollectedVestalCard, playCollectedVestalSkill } from "./boss/collected-vestal";
import { beginDamageStoneWindow, damageStoneHealthEffects } from "./battle-damage-stone";
import { isInvokingMonster } from "./battle-invocation";
import { distance, rejectBattleCommand, writeResolution, skillTargetView, type BattleEntity } from "./battle";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { playMonsterSkillTargets } from "./battle-monster-targets";
import { readPrintedTargets } from "./hero-skill";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent, PendingChoice } from "./command";
import { nextBattleRoll, newlyDefeatedIds, recordMonsterSkill } from "./encounter";
import { monsterCombatThreatDamageBonus } from "./boss/threat-passive-runtime";
import { chainSirenIHighTidePelagicAfterMonsterSkill } from "./boss/siren-i-combat-runtime";
import {
  needsMonsterSkillShuffleChoice,
  resolveMonsterSkill,
  resolveMonsterSkillEffects,
  readMonsterAttackView,
} from "./monster-skill";
import type { MonsterCombatState } from "./monster-skill";
import type { ShuffleIntent } from "./shuffle";
import { beginSkillOwnEffects, afterMonsterOwnCombat } from "./battle-own-effects";
import type { SkillPrefix } from "./battle-own-effects";
import { beforeTargetShuffle } from "./battle-target-pressure";
import type { MonsterCardView } from "./monster-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { resolveMonsterAttackEffects } from "./hero-skill";

/** Self 目标、无英雄目标：不掷攻击骰，走 verified 自身效果（R19–20 / R-048）。 */
function playMonsterSelfSkill(
  state: GameState,
  command: PlayMonsterSkillCommand,
  actor: BattleEntity,
  card: MonsterCardView,
  view: HeroSkillCardView,
  resume?: SkillPrefix,
): ApplyResult {
  const battle = resume?.original ?? state.battle!;
  const combat: MonsterCombatState = {
    actor: {
      id: actor.id,
      wounds: actor.wounds,
      ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
      ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
    },
    target: skillTargetView(actor, battle),
    areaDistance: 0,
    light: battle.light,
    targetAreaLower: false,
    guardedHeroOmitted: false,
    untargetedHeroesBesideTarget: [],
    threatFlatDamageBonus: monsterCombatThreatDamageBonus(state.dungeon, card),
  };
  const roll = resume ? resume.roll! : nextBattleRoll(state.seed, battle.rngCursor);
  let effects = resolveMonsterAttackEffects(view, combat, roll);
  if (effects.resolution.status === "refused")
    return rejectBattleCommand(state, effects.resolution.reason ?? "Self 怪物技能拒绝");
  if (effects.resolution.skipped.length)
    return rejectBattleCommand(state, "怪物完整效果尚未接入，整次拒绝（R-048）");
  if (!resume) {
    const own = beginSkillOwnEffects(state, command, roll, effects);
    if (own) return own;
  }
  const current = resume ? state.battle! : battle;
  const effectCombat = resume ? afterMonsterOwnCombat(combat, current) : combat;
  effects = resolveMonsterAttackEffects(view, effectCombat, roll);
  if (effects.resolution.status === "refused")
    return rejectBattleCommand(state, effects.resolution.reason ?? "Self 怪物技能拒绝");
  const result = effects.resolution;
  const entities = current.entities.map((entry) =>
    writeResolution(entry, actor.id, actor.id, result, true),
  );
  const health = applySkillHealth(
    current,
    entities,
    effects,
    state.seed,
    current.rngCursor + Number(!resume),
    actor.id,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const statuses = applyBattleSkillStatuses(
    { ...current, entities: health.entities, rngCursor: health.rngCursor },
    health.entities,
    actor.id,
    [result],
    state.seed,
    health.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const actorDead = (statuses.entities.find((entry) => entry.id === actor.id)?.wounds ?? 0) >= card.life;
  const event: MonsterSkillResolvedEvent = {
    type: "monsterSkillResolved",
    message: "Self 怪物技能已结算",
    actorId: actor.id,
    skillSlot: command.skillSlot,
    roll,
    actorDead,
    resolution: result,
  };
  const applied: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...current,
        pending: null,
        monsterAction: null,
        rngCursor: statuses.rngCursor,
        entities: statuses.entities.map((entry) =>
          entry.id === actor.id ? { ...entry, dead: actorDead } : entry,
        ),
        light: statuses.light,
        shuffleIntents: [],
        shuffleContinuation: null,
      },
    },
    events: [event, ...health.events, ...statuses.events],
  };
  return recordMonsterSkill(applied, event, newlyDefeatedIds(battle, statuses.entities));
}

/** 调用方手动指定已选技能 / 单个目标；不执行姿态选招、目标 AI 或移动。 */
export type PlayMonsterSkillCommand = {
  readonly damageStoneWindow?: true;
  readonly type: "playMonsterSkill";
  readonly actorId: string;
  readonly targetId: string;
  readonly skillSlot: number;
  readonly shuffleChoice?: "push" | "pull";
  readonly shuffleChoices?: Readonly<Record<string, "push" | "pull">>;
};

/** 说明书 §6.5、§6.10（R19–24）；共享技能骰与先攻 RNG。 */
export function playMonsterSkill(
  state: GameState,
  command: PlayMonsterSkillCommand,
  resume?: SkillPrefix,
): ApplyResult {
  const battle = resume?.original ?? state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const turn = battle.encounter?.turn;
  if (turn && (turn.type !== "monster" || turn.actorId !== command.actorId))
    return rejectBattleCommand(state, "当前不是这只怪物的行动回合");
  if (!resume && isInvokingMonster(battle, command.actorId))
    return rejectBattleCommand(state, "The Invokers 必须以朝红星移动替代整个第2步");
  const prepared = battle.monsterAction;
  if (
    prepared &&
    (prepared.actorId !== command.actorId ||
      prepared.skillSlot !== command.skillSlot ||
      prepared.targetId !== command.targetId)
  )
    return rejectBattleCommand(state, "必须使用本回合已保存的技能与英雄目标");
  const actor = battle.entities.find((entry) => entry.id === command.actorId);
  if (isPyreCard(actor?.monsterCardId))
    return playPyreSkill(state, command.actorId, command.targetId, command.skillSlot);
  if (isCollectedVestalCard(actor?.monsterCardId))
    return playCollectedVestalSkill(state, command.actorId, command.targetId, command.skillSlot);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (!actor || actor.side !== "monster" || actor.dead || !card)
    return rejectBattleCommand(state, "怪物或已关联怪物卡不可用");
  if (actor.life !== card.life)
    return rejectBattleCommand(state, "怪物 Life 与规范化卡不一致（R-048）");
  const attack = readMonsterAttackView(card, command.skillSlot);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const skillEntry = card.skills.find((entry) => entry.slot === command.skillSlot);
  if (skillEntry?.target === "Self") {
    if (command.targetId !== command.actorId)
      return rejectBattleCommand(state, "Self 怪物技能只能以使用者自身为目标（R-048）");
    return playMonsterSelfSkill(state, command, actor, card, attack.view, resume);
  }
  const target = battle.entities.find((entry) => entry.id === command.targetId);
  if (!target || target.side !== "hero" || target.dead)
    return rejectBattleCommand(state, "怪物、英雄目标或已关联怪物卡不可用");
  const count = readPrintedTargets(attack.view);
  if (count.kind === "exact" && count.max > 1)
    return playMonsterSkillTargets(state, command, actor, target, card, count.max, resume);
  const areaDistance = distance(battle.areas, actor.areaId, target.areaId);
  if (areaDistance === null) return rejectBattleCommand(state, "英雄目标区域不可达");
  const heights = { low: 0, normal: 1, high: 2 };
  const actorArea = battle.areas.find((entry) => entry.id === actor.areaId)!;
  const targetArea = battle.areas.find((entry) => entry.id === target.areaId)!;
  // MonsterCombatState 不含英雄专用的压力 / 形态 / 姿态字段。
  const combat: MonsterCombatState = {
    actor: {
      id: actor.id,
      wounds: actor.wounds,
      ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
      ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
    },
    target: skillTargetView(target, battle),
    areaDistance,
    light: battle.light,
    targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
    guardedHeroOmitted:
      !target.guard &&
      battle.entities.some((entry) => entry.side === "hero" && !entry.dead && entry.guard),
    untargetedHeroesBesideTarget: battle.entities
      .filter(
        (entry) =>
          entry.side === "hero" &&
          !entry.dead &&
          entry.id !== target.id &&
          entry.areaId === target.areaId,
      )
      .map((entry) => ({ ...entry, stress: entry.stress! })),
    ...(command.shuffleChoice === undefined ? {} : { shuffleChoice: command.shuffleChoice }),
    threatFlatDamageBonus: monsterCombatThreatDamageBonus(state.dungeon, card),
  };
  const needsChoice =
    command.shuffleChoice === undefined && needsMonsterSkillShuffleChoice(card, command.skillSlot);
  const probe = resolveMonsterSkill(
    card,
    command.skillSlot,
    { ...combat, ...(needsChoice ? { shuffleChoice: "push" as const } : {}) },
    1,
  );
  if (probe.status === "refused") return rejectBattleCommand(state, probe.reason);
  if (probe.resolution.skipped.length)
    return rejectBattleCommand(state, "怪物完整效果尚未接入，整次拒绝（R-048）");
  const statusProbe = applyBattleSkillStatuses(battle, battle.entities, actor.id, [
    {
      ...probe.resolution,
      targetStatusEffects:
        attack.view.verified_status_effects?.filter((e) => e.scope === "target") ??
        probe.resolution.targetStatusEffects ??
        [],
    },
  ]);
  if (statusProbe.status === "refused") return rejectBattleCommand(state, statusProbe.reason);
  if (needsChoice) {
    const choice: PendingChoice = {
      id: `monster-shuffle:${battle.choiceCursor}:${actor.id}:${command.skillSlot}:${target.id}`,
      prompt: "选择怪物技能的位移方向",
      actorId: target.id,
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
          pending: { type: "shuffleDirection", choice, command: { ...command } },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const roll = resume ? resume.roll! : nextBattleRoll(state.seed, battle.rngCursor);
  const current = resume ? state.battle! : battle;
  const effectCombat = resume ? afterMonsterOwnCombat(combat, current) : combat;
  let result = resolveMonsterSkill(card, command.skillSlot, effectCombat, roll);
  if (result.status === "refused") return rejectBattleCommand(state, result.reason);
  let effects = resolveMonsterSkillEffects(card, command.skillSlot, effectCombat, roll);
  if (effects.status === "refused") return rejectBattleCommand(state, effects.reason);
  if (!resume) {
    const own = beginSkillOwnEffects(state, command, roll, effects);
    if (own) return own;
  }
  if (current.trinketRuntime) {
    effects = resolveMonsterSkillEffects(
      card,
      command.skillSlot,
      { ...effectCombat, trinketScope: current },
      roll,
    );
    if (effects.status === "refused") return rejectBattleCommand(state, effects.reason);
    result = {
      ...result,
      resolution: effects.resolution,
      actorDead: (effects.resolution.actorWounds ?? 0) >= card.life,
    };
  }
  const entities = current.entities.map((entry) => {
    const updated = writeResolution(entry, actor.id, target.id, result.resolution, false);
    return entry.id === actor.id ? { ...updated, dead: result.actorDead } : updated;
  });
  const damageStoneWindow = beginDamageStoneWindow(
    state,
    command,
    roll,
    effects.healthEffects,
    resume,
  );
  if (damageStoneWindow) return damageStoneWindow;
  const health = applySkillHealth(
    current,
    entities,
    { ...effects, healthEffects: damageStoneHealthEffects(resume, effects.healthEffects) },
    state.seed,
    current.rngCursor + Number(!resume),
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const pressure = beforeTargetShuffle(state, current, health, [result.resolution]);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const statuses = applyBattleSkillStatuses(
    pressure.state.battle!,
    pressure.state.battle!.entities,
    actor.id,
    [result.resolution],
    state.seed,
    pressure.state.battle!.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const casualtyIds = newlyDefeatedIds(battle, statuses.entities);
  const event: MonsterSkillResolvedEvent = {
    ...(attack.necromancerSummon && result.resolution.outcome !== "miss"
      ? { summonTargetAreaId: target.areaId }
      : {}),
    ...(resume?.announced ? { phase: "afterOwn" as const } : {}),
    type: "monsterSkillResolved",
    message: "已选怪物攻击已结算",
    actorId: actor.id,
    skillSlot: command.skillSlot,
    roll,
    actorDead: result.actorDead,
    resolution: result.resolution,
  };
  const intents: ShuffleIntent[] = [];
  if (result.resolution.actorShuffle)
    intents.push({
      entityId: actor.id,
      relativeToId: target.id,
      move: result.resolution.actorShuffle,
    });
  if (result.resolution.targetShuffle)
    intents.push({
      entityId: target.id,
      relativeToId: actor.id,
      move: result.resolution.targetShuffle,
    });
  const applied: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...pressure.state.battle!,
        pending: null,
        monsterAction: null,
        rngCursor: statuses.rngCursor,
        entities: statuses.entities,
        light: statuses.light,
        shuffleIntents: intents,
        shuffleContinuation: intents.length
          ? {
              ...event,
              casualtyIds,
            }
          : null,
      },
    },
    events: [event, ...pressure.events, ...statuses.events],
  };
  return intents.length
    ? applied
    : chainSirenIHighTidePelagicAfterMonsterSkill(
        recordMonsterSkill(applied, event, casualtyIds),
        actor.id,
        command.skillSlot,
        target.areaId,
      );
}
