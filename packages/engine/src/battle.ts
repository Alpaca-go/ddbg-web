import {
  heroSkillUsesSelfTarget,
  needsHeroSkillShuffleChoice,
  resolveHeroSkill,
} from "./hero-skill";
import type {
  HeroSkillCardView,
  HeroSkillResolution,
  SkillActorState,
  SkillCombatState,
  SkillTargetState,
} from "./hero-skill";
import { encounterSkillProblem, nextBattleRoll, recordEncounterSkill } from "./encounter";
import type { EncounterState } from "./encounter";
import type {
  ApplyResult,
  GameState,
  HeroSkillResolvedEvent,
  MonsterSkillResolvedEvent,
  PendingChoice,
} from "./command";
import type { ShuffleIntent } from "./shuffle";
import type { MonsterCardView, MonsterCombatState } from "./monster-skill";
import type { PlayMonsterSkillCommand } from "./battle-monster";

/** Phase 2 沙盒输入，由已核实数据或测试夹具提供；不是正式存档协议。 */
export type BattleEntity = SkillTargetState &
  SkillActorState & {
    readonly areaId: string;
    readonly hero: string | null;
    readonly skillIds: readonly string[];
    readonly guard: boolean;
    readonly dead: boolean;
    /** 怪物占姿态格数，必须由已核实数据提供；先攻接入时不猜大型与否。 */
    readonly stanceSlots?: 1 | 2;
    readonly monsterCardId?: string;
    /** 仅保存已有堆的标识，清除时整堆移除；不猜 duration / 面值。 */
    readonly bleed: readonly string[];
    readonly blight: readonly string[];
  };

export type BattleArea = {
  readonly id: string;
  /** 板块已核实的容量；未提供时位移解析器拒绝，不补默认值。 */
  readonly capacity?: number;
  readonly elevation: "low" | "normal" | "high";
  readonly adjacent: readonly string[];
};

export type PlayHeroSkillCommand = {
  readonly type: "playHeroSkill";
  readonly actorId: string;
  readonly targetId: string;
  readonly skillId: string;
  readonly face?: "front" | "back";
  readonly shuffleChoice?: "push" | "pull";
};

export type BattleSetup = {
  readonly entities: readonly BattleEntity[];
  readonly areas: readonly BattleArea[];
  readonly skills: readonly HeroSkillCardView[];
  readonly monsters?: readonly MonsterCardView[];
  readonly light: number;
};

export type BattleState = BattleSetup & {
  readonly encounter?: EncounterState;
  readonly rngCursor: number;
  readonly choiceCursor: number;
  readonly pending:
    | {
        readonly type: "shuffleDirection";
        readonly choice: PendingChoice;
        readonly command: PlayHeroSkillCommand | PlayMonsterSkillCommand;
      }
    | {
        readonly type: "shuffleArea";
        readonly choice: PendingChoice;
        readonly path: readonly string[];
      }
    | null;
  /** 自身意图先于目标意图；显式 resolveShuffles 命令完成位置应用。 */
  readonly shuffleIntents: readonly ShuffleIntent[];
  /** 位移完成后再记录行动 / 死亡补位，不能重复执行技能或重复扣行动。 */
  readonly shuffleContinuation:
    | (HeroSkillResolvedEvent & {
        /** 位移后的暴击同区名单，沿用原骰面与原攻击数值重算。 */
        readonly criticalContext?: {
          readonly combat: SkillCombatState;
          readonly entities: readonly BattleEntity[];
        };
      })
    | (MonsterSkillResolvedEvent & {
        readonly criticalContext?: {
          readonly combat: MonsterCombatState;
          readonly entities: readonly BattleEntity[];
        };
      })
    | null;
};

export function createBattleState(seed: number, setup: BattleSetup): GameState {
  const unique = (ids: readonly string[]) =>
    ids.every((id) => id !== "") && new Set(ids).size === ids.length;
  if (
    !unique(setup.entities.map((entity) => entity.id)) ||
    !unique(setup.areas.map((area) => area.id)) ||
    !unique(setup.skills.map((skill) => skill.id)) ||
    !unique((setup.monsters ?? []).map((monster) => monster.id))
  ) {
    throw new Error("沙盒实体、区域与技能 id 必须非空且各自唯一");
  }
  if (
    !Number.isInteger(seed) ||
    !Number.isInteger(setup.light) ||
    setup.light < 0 ||
    setup.light > 5
  ) {
    throw new Error("种子必须是整数；光照必须是 0–5 的整数");
  }
  for (const area of setup.areas) {
    if (
      !["low", "normal", "high"].includes(area.elevation) ||
      (area.capacity !== undefined &&
        (!Number.isSafeInteger(area.capacity) || area.capacity < 0)) ||
      area.adjacent.some(
        (id) =>
          id === area.id ||
          !setup.areas.some((other) => other.id === id && other.adjacent.includes(area.id)),
      )
    ) {
      throw new Error("区域邻接必须连接已知区域且双向（R-021）");
    }
  }
  for (const entity of setup.entities) {
    if (entity.monsterCardId !== undefined) {
      const card = setup.monsters?.find((entry) => entry.id === entity.monsterCardId);
      if (entity.side !== "monster" || !card || card.life !== entity.life)
        throw new Error("怪物实体必须关联已知卡牌，Life 与规范化卡一致（R-048）");
    }
    const integer = (value: number) => Number.isInteger(value) && value >= 0;
    if (
      !integer(entity.wounds) ||
      !integer(entity.dodge) ||
      !["hero", "monster"].includes(entity.side) ||
      (entity.side === "monster" &&
        (entity.life === undefined ||
          !integer(entity.life) ||
          entity.life === 0 ||
          entity.stress !== undefined)) ||
      (entity.side === "hero" &&
        (entity.life !== undefined ||
          entity.stress === undefined ||
          !integer(entity.stress) ||
          entity.stress > 10))
    ) {
      throw new Error("沙盒伤口 / Dodge / 压力无效，或怪物缺少已核实 Life；英雄 Life 暂不接入");
    }
    if (
      !setup.areas.some((area) => area.id === entity.areaId) ||
      entity.skillIds.some((id) => !setup.skills.some((skill) => skill.id === id)) ||
      (entity.side === "hero" &&
        (entity.stance === undefined || entity.stress === undefined || entity.hero === null))
    ) {
      throw new Error("实体必须有已知区域 / 技能；英雄必须提供姿态、压力与英雄名");
    }
  }
  return {
    seed,
    notes: [],
    battle: {
      ...structuredClone(setup),
      rngCursor: 0,
      choiceCursor: 0,
      pending: null,
      shuffleIntents: [],
      shuffleContinuation: null,
    },
  };
}

export function rejectBattleCommand(state: GameState, message: string): ApplyResult {
  return {
    state,
    events: [{ type: "commandRefused", message }],
    ...(state.battle?.pending ? { pendingChoice: state.battle.pending.choice } : {}),
  };
}

/** 区域邻接图最短距离（R-021）；不把未知板块补成直线。 */
export function distance(areas: readonly BattleArea[], from: string, to: string): number | null {
  const queue = [{ id: from, steps: 0 }];
  const seen = new Set([from]);
  for (const current of queue) {
    if (current.id === to) return current.steps;
    for (const id of areas.find((area) => area.id === current.id)?.adjacent ?? []) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push({ id, steps: current.steps + 1 });
      }
    }
  }
  return null;
}

export function playHeroSkill(state: GameState, command: PlayHeroSkillCommand): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const turnProblem = encounterSkillProblem(battle, command.actorId, command.skillId);
  if (turnProblem) return rejectBattleCommand(state, turnProblem);
  const actor = battle.entities.find((entity) => entity.id === command.actorId);
  const target = battle.entities.find((entity) => entity.id === command.targetId);
  const skill = battle.skills.find((card) => card.id === command.skillId);
  if (!actor || actor.side !== "hero" || actor.dead || !target || target.dead || !skill) {
    return rejectBattleCommand(state, "使用者、目标或技能不存在 / 不可用");
  }
  if (!actor.skillIds.includes(skill.id) || (skill.hero !== null && actor.hero !== skill.hero)) {
    return rejectBattleCommand(state, "使用者没有装备这张英雄技能");
  }
  const areaDistance = distance(battle.areas, actor.areaId, target.areaId);
  const actorArea = battle.areas.find((area) => area.id === actor.areaId);
  const targetArea = battle.areas.find((area) => area.id === target.areaId);
  if (areaDistance === null || !actorArea || !targetArea) {
    return rejectBattleCommand(state, "区域不存在或目标区域不可达");
  }
  const elevations = { low: 0, normal: 1, high: 2 };
  const nearby = (areaId: string) =>
    battle.entities
      .filter(
        (entity) =>
          entity.side === "hero" &&
          !entity.dead &&
          entity.areaId === areaId &&
          entity.id !== actor.id &&
          entity.id !== target.id,
      )
      .map((entity) => ({ id: entity.id, stress: entity.stress! }));
  const sameArea = actor.areaId === target.areaId;
  const context: SkillCombatState = {
    actor,
    target,
    light: battle.light,
    targetAreaLower: elevations[actorArea.elevation] > elevations[targetArea.elevation],
    targetInActorArea: target.side === "hero" && sameArea,
    heroesBesideActor: nearby(actor.areaId),
    untargetedHeroesBesideTarget: sameArea ? [] : nearby(target.areaId),
    guardedEnemyOmitted:
      !target.guard &&
      battle.entities.some((entity) => entity.side === "monster" && !entity.dead && entity.guard),
    ...(command.face ? { face: command.face } : {}),
    ...(command.shuffleChoice ? { shuffleChoice: command.shuffleChoice } : {}),
  };
  // 无 Acc 的自身效果不选目标区域；只有纯函数确认可直接结算才走此路径（R19）。
  const ownProbe = actor.id === target.id ? resolveHeroSkill(skill, context, 1) : null;
  const ownEffect = ownProbe?.outcome === null && ownProbe.status === "resolved";
  const combat = ownEffect ? context : { ...context, areaDistance, targetsInArea: 1 };
  const needsChoice =
    command.shuffleChoice === undefined && needsHeroSkillShuffleChoice(skill, command.face);
  // 先校验，拒绝或等待选择均不推进 RNG；方向选择必须在掷骰之前完成。
  const probe = resolveHeroSkill(
    skill,
    { ...combat, ...(needsChoice ? { shuffleChoice: "push" as const } : {}) },
    1,
  );
  if (probe.status === "refused") return rejectBattleCommand(state, probe.reason ?? "技能拒绝结算");
  if (needsChoice) {
    const choice: PendingChoice = {
      id: `shuffle:${battle.choiceCursor}:${actor.id}:${skill.id}:${target.id}`,
      prompt: "选择技能的位移方向",
      actorId: actor.id,
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
  let roll: number | null = null;
  let resolution = probe;
  if (probe.outcome !== null) {
    roll = nextBattleRoll(state.seed, battle.rngCursor);
    resolution = resolveHeroSkill(skill, combat, roll);
  }
  if (resolution.status === "refused")
    return rejectBattleCommand(state, resolution.reason ?? "技能拒绝结算");
  const entities = battle.entities.map((entity) =>
    writeResolution(
      entity,
      actor.id,
      target.id,
      resolution,
      heroSkillUsesSelfTarget(skill, command.face),
    ),
  );
  const shuffleIntents = [...battle.shuffleIntents];
  if (resolution.actorShuffle)
    shuffleIntents.push({
      entityId: actor.id,
      relativeToId: target.id,
      move: resolution.actorShuffle,
    });
  if (resolution.targetShuffle)
    shuffleIntents.push({
      entityId: target.id,
      relativeToId: actor.id,
      move: resolution.targetShuffle,
    });
  const skillEvent: HeroSkillResolvedEvent = {
    type: "heroSkillResolved",
    message: "英雄技能已结算",
    actorId: actor.id,
    roll,
    resolution,
  };
  const result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...battle,
        entities,
        shuffleIntents,
        pending: null,
        rngCursor: battle.rngCursor + (roll === null ? 0 : 1),
        shuffleContinuation: shuffleIntents.length
          ? {
              ...skillEvent,
              ...(resolution.outcome === "crit"
                ? { criticalContext: { combat, entities: battle.entities } }
                : {}),
            }
          : null,
      },
    },
    events: [skillEvent],
  };
  return shuffleIntents.length ? result : recordEncounterSkill(result);
}

export function writeResolution(
  entity: BattleEntity,
  actorId: string,
  targetId: string,
  result: HeroSkillResolution,
  selfTarget: boolean,
): BattleEntity {
  let updated = entity;
  if (entity.id === actorId)
    updated = {
      ...updated,
      wounds: result.actorWounds ?? updated.wounds,
      ...(result.actorStress === null ? {} : { stress: result.actorStress }),
      ...(result.actorForm === null ? {} : { form: result.actorForm }),
      bleed: result.actorBleedCleared ? [] : updated.bleed,
      blight: result.actorBlightCleared ? [] : updated.blight,
    };
  if (entity.id === targetId)
    updated = {
      ...updated,
      wounds: entity.id === actorId ? (result.actorWounds ?? result.wounds) : result.wounds,
      dead: result.targetDead,
      ...(result.targetStress === null || entity.id === actorId
        ? {}
        : { stress: result.targetStress }),
      bleed: result.targetBleedCleared ? [] : updated.bleed,
      blight: result.targetBlightCleared ? [] : updated.blight,
    };
  const nearby = [
    ...(result.besideActorStress ?? []),
    ...(result.untargetedBesideTargetStress ?? []),
  ].find((hero) => hero.id === entity.id);
  // 非 Self 卡也能把自己选为友方目标；两份快照各自含自身 / 目标增量。
  if (entity.id === actorId && entity.id === targetId && !selfTarget) {
    const stress = entity.stress;
    updated = {
      ...updated,
      wounds: Math.max(0, (result.actorWounds ?? entity.wounds) + result.wounds - entity.wounds),
      ...(stress === undefined
        ? {}
        : {
            stress: Math.max(
              0,
              Math.min(
                10,
                (result.actorStress ?? stress) +
                  (result.targetStress ?? stress) -
                  stress +
                  (result.outcome === "crit" ? 1 : 0),
              ),
            ),
          }),
    };
  }
  return nearby ? { ...updated, stress: nearby.stress } : updated;
}
