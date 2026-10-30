import {
  heroSkillUsesSelfTarget,
  needsHeroSkillShuffleChoice,
  resolveHeroSkill,
  resolveHeroSkillEffects,
  skillIgnoresGuard,
} from "./hero-skill";
import type {
  HeroSkillCardView,
  HeroSkillResolution,
  SkillActorState,
  SkillCombatState,
  SkillTargetState,
} from "./hero-skill";
import {
  encounterSkillProblem,
  nextBattleRoll,
  newlyDefeatedIds,
  recordEncounterSkill,
} from "./encounter";
import type { EncounterState } from "./encounter";
import type {
  ApplyResult,
  GameEvent,
  GameState,
  HeroSkillEmptyAreaResolvedEvent,
  HeroSkillResolvedEvent,
  MonsterSkillResolvedEvent,
  PendingChoice,
} from "./command";
import type { ShuffleIntent } from "./shuffle";
import type { MonsterCardView } from "./monster-skill";
import type { PlayMonsterSkillCommand } from "./battle-monster";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { PreparedMonsterAction } from "./battle-monster-action";
import { healingForbidden } from "./battle-healing";
import { clearAncestorConditions } from "./battle-ancestor";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses, readHeroPassiveDefence } from "./battle-skill-status";
import { statusProjection, statusStackProblem } from "./status";
import type { StatusStack } from "./status";
import type { ResolveCard } from "./pressure";
import type { LootState, LootToken } from "./loot";
import type { ConditionPool } from "./conditions";
import type { PassiveHolder } from "./passive";
import { cancelSkillAfterRoll } from "./battle-passive";
import { withFleshOneBodyPoolState } from "./boss/flesh-i-combat-runtime";
import { chainSwinePrinceIEnragedDestructionAfterHeroSkill } from "./boss/swine-prince-i-combat-runtime";
import { beginSkillOwnEffects, afterHeroOwnCombat } from "./battle-own-effects";
import type { SkillPrefix } from "./battle-own-effects";
import { beforeTargetShuffle } from "./battle-target-pressure";
import { beginHeroTrinketWindow } from "./battle-trinket-ability";
import type { HeroTrinketAttack } from "./battle-trinket-ability";
import type {
  HeroSkillTrinketWindow,
  HeroSkillTrinketId,
} from "../../data/src/hero-skill-trinkets";

/** Phase 2 沙盒输入，由已核实数据或测试夹具提供；不是正式存档协议。 */
export type BattleEntity = PassiveHolder &
  SkillTargetState &
  SkillActorState & {
    readonly areaId: string;
    readonly hero: string | null;
    readonly skillIds: readonly string[];
    readonly guard: boolean;
    readonly dead: boolean;
    /** 怪物占姿态格数，必须由已核实数据提供；先攻接入时不猜大型与否。 */
    readonly stanceSlots?: 1 | 2;
    readonly monsterCardId?: string;
    /** The Flesh · One Body 共享 Life 池标识；同池实体 wounds / life 由运行时同步。 */
    readonly oneBodyPoolId?: string;
    readonly heroStatId?: string;
    /** 仅保存已有堆的标识，清除时整堆移除；不猜 duration / 面值。 */
    readonly bleed: readonly string[];
    readonly blight: readonly string[];
    /** 真正的状态堆，和无 duration 的旧沙盒标识区别；缺失不补持续时间。 */
    readonly statusStacks?: readonly StatusStack[];
    readonly innateProtection?: boolean;
    readonly resolveTested?: boolean;
    readonly resolveCardId?: string | null;
    readonly heroLevel?: number;
  };

export type BattleArea = {
  readonly hideAndHeal?: true;
  readonly lootTheChest?: true;
  readonly invokerGoal?: true;
  readonly invokingAbyss?: true;
  readonly spikedPit?: true;
  readonly circleOfPower?: true;
  readonly feelingThePresence?: true;
  readonly ancestorGlory?: true;
  readonly healingForbidden?: true;
  readonly endTurnHeal?: 3;
  /** 已复核 Cornered；只接明确印刷值，不给未命名特殊标记补值。 */
  readonly endTurnStress?: 1 | -1;
  readonly endTurnStressName?: "Cornered" | "Stressful Darkness" | "Beacon of Light";
  readonly id: string;
  /** 板块已核实的容量；未提供时位移解析器拒绝，不补默认值。 */
  readonly capacity?: number;
  readonly elevation: "low" | "normal" | "high";
  readonly adjacent: readonly string[];
};

export type PlayHeroSkillCommand = {
  readonly type: "playHeroSkill";
  /** 新网页宣告启用 R26 窗口；旧日志缺此字段时保留原来的直接结算。 */
  readonly trinketWindow?: HeroSkillTrinketWindow;
  readonly actorId: string;
  readonly targetId: string;
  readonly skillId: string;
  readonly face?: "front" | "back";
  readonly shuffleChoice?: "push" | "pull";
};

export type BattleSetup = {
  readonly trinkets?: import("./trinket-acquisition").TrinketPool;
  readonly roomName?: string;
  readonly conditions?: ConditionPool;
  /** 只使用逐面获批属性；整卡其他图标的验证状态不因此改变。 */
  readonly heroStats?: readonly {
    readonly id: string;
    readonly name: string;
    readonly life: number;
    readonly speed?: number | null;
    readonly attributesVerified: boolean;
    readonly level?: number;
    readonly verified_condition_defence?: import("../../data/src/normalize/hero-stat").HeroConditionDefence;
    readonly verified_higher_condition_defence?: import("../../data/src/normalize/hero-higher-defence").HigherHeroDefence;
    readonly verified_buff_defence?: {
      readonly resistant: boolean;
      readonly immune: boolean;
      readonly source: "print_front";
    };
  }[];
  readonly entities: readonly BattleEntity[];
  readonly areas: readonly BattleArea[];
  readonly skills: readonly HeroSkillCardView[];
  readonly monsters?: readonly MonsterCardView[];
  readonly light: number;
  readonly resolveCards?: readonly ResolveCard[];
  readonly lootAreas?: readonly string[];
  /** Collector Room 三箱所在逻辑区；仅由获批几何绑定。生产目录未批时留空，测试夹具显式传入。 */
  readonly collectorRoomLootAreaId?: string;
  /** Collector 固定姿态对应的板块区域；显式逻辑区绑定，不从英雄当前位置推断几何。 */
  readonly collectorCollectedStanceAreas?: Readonly<
    Partial<Record<"defensive" | "ranged" | "support", string>>
  >;
  /** 下一房间可显式传回同地牢的有限池；回村另行重建。 */
  readonly lootPool?: LootState;
  readonly startingProvisions?: true;
  /** Prophet Room · 房间卡 d10 标记与战斗区域 id 绑定；Prophet 战由已核实布局提供（R-048 几何 hold 时测试夹具显式传入）。 */
  readonly prophetRoomD10AreaTable?: readonly {
    readonly marker: string;
    readonly areaId: string;
  }[];
  /** 显式保留先攻确定后、回合开始效果前的免费补给窗口。 */
  readonly provisionWindows?: true;
  readonly provisions?: readonly {
    readonly id: string;
    readonly face: "food" | "bandage" | "potion" | "torch" | "tool";
  }[];
};

export type OneBodyLifePool = {
  readonly life: number;
  readonly wounds: number;
};

export type BattleState = BattleSetup & {
  /** R-028：任一角色的新回合开始时清空；每件饰品各自计数。 */
  readonly usedTrinketIds?: readonly string[];
  readonly oneBodyPools?: Readonly<Record<string, OneBodyLifePool>>;
  readonly lootChestUsed?: true;
  /** Prophet · Wooden Pew 区域标记（不占容量、非可选目标；room 代币）。 */
  readonly woodenPews?: readonly {
    readonly areaId: string;
    readonly pewIndex: 0 | 1 | 2 | 3;
  }[];
  readonly prophetCalamitousUsedThisRound?: true;
  /** Prophet I：本战斗轮内已完成的先知行动次数（Calamitous=1、Rubble=3 等边界）。 */
  readonly prophetActionsThisRound?: number;
  /** Hag I：本战斗轮内已完成的 Hag 行动次数（Into the Pot! 首行动边界）。 */
  readonly hagActionsThisRound?: number;
  /** Fanatic I：本战斗轮内已完成的 Fanatic 行动次数（G-05 / 先攻 3 张配合）。 */
  readonly fanaticActionsThisRound?: number;
  readonly skillPrefix?: SkillPrefix | null;
  readonly encounter?: EncounterState;
  readonly rngCursor: number;
  readonly resolveDecks?: Readonly<Partial<Record<"virtue" | "affliction", readonly string[]>>>;
  readonly choiceCursor: number;
  readonly startingProvisionsReady?: true;
  readonly loot?: LootState | undefined;
  /** 保存选招骰与目标；方向待选 / 攻击拒绝不能重新选招。 */
  readonly monsterAction: PreparedMonsterAction | null;
  readonly pending:
    | {
        readonly type: "heroAttackTrinkets";
        readonly choice: PendingChoice;
        readonly command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
        readonly roll: number;
        readonly selected: readonly HeroSkillTrinketId[];
        readonly offers: readonly {
          readonly cardId: HeroSkillTrinketId;
          readonly face: "upright" | "inverted";
        }[];
      }
    | {
        readonly type: "heroTrinket";
        readonly choice: PendingChoice;
        readonly command: PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
        readonly roll: number;
        readonly face: "upright" | "inverted";
      }
    | {
        readonly type: "collectorSummon";
        readonly actorId: string;
        readonly choice: PendingChoice;
        readonly part: import("./boss/types").CollectorCollectedPart;
        readonly displacements: Readonly<
          Partial<Record<import("./boss/types").CollectorCollectedPart, string>>
        >;
      }
    | {
        readonly type: "necromancerSummon";
        readonly choice: PendingChoice;
        readonly resolved: MonsterSkillResolvedEvent;
        readonly casualtyIds: readonly string[];
      }
    | { readonly type: "trinketReward"; readonly actorId: string; readonly choice: PendingChoice }
    | { readonly type: "invokerMove"; readonly actorId: string; readonly choice: PendingChoice }
    | {
        readonly type: "invokerDisplace";
        readonly actorId: string;
        readonly choice: PendingChoice;
        readonly to: string;
      }
    | {
        readonly type: "conditionReplace";
        readonly choice: PendingChoice;
        readonly resolved: MonsterSkillResolvedEvent;
        readonly events: readonly GameEvent[];
        readonly casualtyIds: readonly string[];
        readonly remainingInfections: readonly HeroSkillResolution[];
      }
    | {
        readonly type: "smallDisplace";
        readonly actorId: string;
        readonly events: readonly GameEvent[];
        readonly choice: PendingChoice;
      }
    | {
        readonly type: "turnStartProvision";
        readonly actorId: string;
        readonly choice: PendingChoice;
      }
    | {
        readonly type: "startingProvision";
        readonly choice: PendingChoice;
        readonly wilds: readonly import("./starting-provisions").StartingWild[];
      }
    | {
        readonly type: "lootReward";
        readonly choice: PendingChoice;
        readonly actorId: string;
        readonly token: LootToken;
        readonly phase: "reward" | "face";
      }
    | {
        readonly type: "resolveProvision";
        readonly choice: PendingChoice;
        readonly actorId: string;
      }
    | {
        readonly type: "shuffleDirection";
        readonly choice: PendingChoice;
        readonly command:
          PlayHeroSkillCommand | PlayHeroSkillTargetsCommand | PlayMonsterSkillCommand;
        readonly shuffleTargetId?: string;
      }
    | {
        readonly type: "monsterMove";
        readonly choice: PendingChoice;
      }
    | {
        readonly type: "monsterDisplace";
        readonly choice: PendingChoice;
        readonly to: string;
      }
    | {
        readonly type: "shuffleReduction";
        readonly choice: PendingChoice;
      }
    | {
        readonly type: "shuffleArea";
        readonly choice: PendingChoice;
        readonly path: readonly string[];
      }
    | null;
  /** 自身意图先于目标意图；显式 resolveShuffles 命令完成位置应用。 */
  readonly shuffleIntents: readonly ShuffleIntent[];
  readonly shufflePassiveIds?: readonly string[];
  /** 位移完成后再记录行动 / 死亡补位，不能重复执行技能或重复扣行动。 */
  readonly shuffleContinuation:
    | (HeroSkillEmptyAreaResolvedEvent & {
        readonly targetIds?: never;
        readonly casualtyIds?: readonly string[];
      })
    | (HeroSkillResolvedEvent & {
        readonly targetIds?: readonly string[];
        readonly casualtyIds?: readonly string[];
      })
    | (MonsterSkillResolvedEvent & {
        readonly targetIds?: readonly string[];
        readonly shuffleChooserId?: string;
        readonly casualtyIds?: readonly string[];
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
    !unique((setup.monsters ?? []).map((monster) => monster.id)) ||
    !unique((setup.heroStats ?? []).map((card) => card.id))
  ) {
    throw new Error("沙盒实体、区域与技能 id 必须非空且各自唯一");
  }
  if (
    setup.lootAreas &&
    (!unique(setup.lootAreas) ||
      setup.lootAreas.some((id) => !setup.areas.some((area) => area.id === id)))
  ) {
    throw new Error("宝箱标记必须是唯一的已知区域");
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
    if (entity.statusStacks !== undefined) {
      const problem = statusStackProblem(entity.statusStacks);
      if (problem) throw new Error(problem);
    }
    if (entity.innateProtection !== undefined && typeof entity.innateProtection !== "boolean")
      throw new Error("内置防护必须明确为布尔值");
    if (entity.heroStatId !== undefined || (entity.side === "hero" && entity.life !== undefined)) {
      const card = setup.heroStats?.find((entry) => entry.id === entity.heroStatId);
      if (
        entity.side !== "hero" ||
        card?.attributesVerified !== true ||
        card.name !== entity.hero ||
        !Number.isSafeInteger(card.life) ||
        card.life <= 0 ||
        card.life !== entity.life ||
        entity.wounds > card.life
      )
        throw new Error("英雄 Life 必须关联匹配的已核实属性面，伤口不得超过 Life（R-048、R29）");
    }
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
        (entity.stress === undefined || !integer(entity.stress) || entity.stress > 10))
    ) {
      throw new Error("沙盒伤口 / Dodge / 压力无效，或怪物缺少已核实 Life");
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
  if (
    setup.entities.some((entry) => entry.side === "hero" && entry.life !== undefined) &&
    setup.entities.some((entry) => entry.side === "hero" && !entry.dead && entry.life === undefined)
  )
    throw new Error("生命沙盒中的存活英雄都须关联已核实 Life，不能混用无 Life 的旧沙盒");
  return {
    seed,
    notes: [],
    battle: {
      ...structuredClone(setup),
      entities: structuredClone(
        clearAncestorConditions(
          setup.areas,
          setup.entities.map((entity) =>
            entity.statusStacks === undefined
              ? entity
              : { ...entity, ...statusProjection(entity.statusStacks, entity.innateProtection) },
          ),
        ),
      ),
      rngCursor: 0,
      choiceCursor: 0,
      monsterAction: null,
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

export function playHeroSkill(
  state: GameState,
  command: PlayHeroSkillCommand,
  resume?: SkillPrefix,
  trinketAttack?: HeroTrinketAttack,
): ApplyResult {
  const battle = resume?.original ?? state.battle;
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
      .map((entity) => ({ ...entity, stress: entity.stress! }));
  const sameArea = actor.areaId === target.areaId;
  const context: SkillCombatState = {
    ...((resume?.trinketAttack ?? trinketAttack)
      ? { trinketModifiers: (resume?.trinketAttack ?? trinketAttack)!.modifiers }
      : {}),
    actor,
    target: skillTargetView(target, battle),
    light: battle.light,
    targetAreaLower: elevations[actorArea.elevation] > elevations[targetArea.elevation],
    targetInActorArea: target.side === "hero" && sameArea,
    heroesBesideActor: nearby(actor.areaId),
    untargetedHeroesBesideTarget: sameArea ? [] : nearby(target.areaId),
    guardedEnemyOmitted: skillIgnoresGuard(skill)
      ? false
      : !target.guard &&
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
  if (
    (skill.verified_status_effects !== undefined || probe.targetShuffle !== null || needsChoice) &&
    probe.skipped.some((skip) => skip.code === "effect_lines")
  )
    return rejectBattleCommand(state, "已核实状态与同行效果尚未完整支持，整次拒绝（R-048）");
  if (
    probe.effect === "heal" &&
    (healingForbidden(battle, actor.id) || healingForbidden(battle, target.id))
  )
    return rejectBattleCommand(state, "Unholy Aura：此区域英雄不能治疗或被治疗（R-067）");
  const statusProbe = applyBattleSkillStatuses(battle, battle.entities, actor.id, [probe]);
  if (statusProbe.status === "refused") return rejectBattleCommand(state, statusProbe.reason);
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
    roll = resume
      ? resume.roll
      : (trinketAttack?.roll ?? nextBattleRoll(state.seed, battle.rngCursor));
    if (roll === null) return rejectBattleCommand(state, "技能续接缺少原骰面");
    resolution = resolveHeroSkill(skill, combat, roll);
  }
  if (resolution.status === "refused")
    return rejectBattleCommand(state, resolution.reason ?? "技能拒绝结算");
  if (trinketAttack?.preview)
    return {
      state,
      events: [
        { type: "heroSkillResolved", message: "饰品技能预览", actorId: actor.id, roll, resolution },
      ],
    };
  if (command.trinketWindow && !resume && !trinketAttack && roll !== null) {
    const window = beginHeroTrinketWindow(state, command, roll, skill, resolution);
    if (window) return window;
  }
  const current = resume ? state.battle! : battle;
  const effectCombat = resume ? afterHeroOwnCombat(combat, current) : combat;
  const effects = resolveHeroSkillEffects(skill, effectCombat, roll ?? 1);
  resolution = effects.resolution;
  if (!resume) {
    const own = beginSkillOwnEffects(state, command, roll, effects, undefined, trinketAttack);
    if (own) return own;
  }
  const entities = current.entities.map((entity) =>
    writeResolution(
      entity,
      actor.id,
      target.id,
      resolution,
      heroSkillUsesSelfTarget(skill, command.face),
    ),
  );
  const health = applySkillHealth(
    current,
    entities,
    effects,
    state.seed,
    current.rngCursor + (resume || roll === null ? 0 : 1),
    actor.id,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  if (health.cancelled) return cancelSkillAfterRoll(state, actor.id, health);
  const pressure = beforeTargetShuffle(state, current, health, [resolution]);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const statuses = applyBattleSkillStatuses(
    pressure.state.battle!,
    pressure.state.battle!.entities,
    actor.id,
    [resolution],
    state.seed,
    pressure.state.battle!.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const casualtyIds = newlyDefeatedIds(battle, statuses.entities);
  const shuffleIntents = [...current.shuffleIntents];
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
    ...(resume?.announced ? { phase: "afterOwn" as const } : {}),
    type: "heroSkillResolved",
    message: "英雄技能已结算",
    actorId: actor.id,
    roll,
    resolution,
  };
  const syncedBattle = withFleshOneBodyPoolState(
    { ...pressure.state.battle!, entities: statuses.entities },
    statuses.entities,
  );
  const result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...syncedBattle,
        light: statuses.light,
        shuffleIntents,
        pending: null,
        rngCursor: statuses.rngCursor,
        shuffleContinuation: shuffleIntents.length
          ? {
              ...skillEvent,
              casualtyIds,
            }
          : null,
      },
    },
    events: [skillEvent, ...pressure.events, ...statuses.events],
  };
  const chained = chainSwinePrinceIEnragedDestructionAfterHeroSkill(
    result,
    battle.entities,
    actor.id,
  );
  return shuffleIntents.length ? chained : recordEncounterSkill(chained, skillEvent, casualtyIds);
}

/** 旧技能视图只计算原始伤口；Life 由有序生命层处理，不能误判英雄为怪物死亡。 */
export function skillTargetView(entity: BattleEntity, battle?: BattleSetup): SkillTargetState {
  if (entity.side !== "hero") {
    if (!battle) return entity;
    const { monsterTypeTags: _tags, ...target } = entity;
    void _tags;
    const card = battle.monsters?.find((card) => card.id === entity.monsterCardId);
    return card && card.verification.unverified === false && card.type_position_tags
      ? {
          ...target,
          monsterTypeTags: card.type_position_tags.filter(
            (tag) => tag !== "Front" && tag !== "Back",
          ),
        }
      : target;
  }
  const { life: _life, ...target } = entity;
  void _life;
  const stat = battle?.heroStats?.find((card) => card.id === entity.heroStatId);
  if (stat && stat.level !== 1)
    return {
      ...target,
      shuffleResist: readHeroPassiveDefence(battle!, entity)?.shuffleResistant ?? false,
    };
  return target;
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
      ...(result.actorForm === null ? {} : { form: result.actorForm }),
      bleed: result.actorBleedCleared ? [] : updated.bleed,
      blight: result.actorBlightCleared ? [] : updated.blight,
    };
  if (entity.id === targetId)
    updated = {
      ...updated,
      wounds: entity.id === actorId ? (result.actorWounds ?? result.wounds) : result.wounds,
      dead: result.targetDead,
      bleed: result.targetBleedCleared ? [] : updated.bleed,
      blight: result.targetBlightCleared ? [] : updated.blight,
    };
  // 非 Self 卡也能把自己选为友方目标；两份快照各自含自身 / 目标增量。
  if (entity.id === actorId && entity.id === targetId && !selfTarget) {
    updated = {
      ...updated,
      wounds: Math.max(0, (result.actorWounds ?? entity.wounds) + result.wounds - entity.wounds),
    };
  }
  const stress = resolveSkillStress(entity, actorId, targetId, result, selfTarget);
  if (updated.statusStacks !== undefined) {
    const removeBleed =
      (entity.id === actorId && result.actorBleedCleared) ||
      (entity.id === targetId && result.targetBleedCleared);
    const removeBlight =
      (entity.id === actorId && result.actorBlightCleared) ||
      (entity.id === targetId && result.targetBlightCleared);
    const removeStunMark =
      (entity.id === actorId && result.actorStunMarkCleared) ||
      (entity.id === targetId && result.targetStunMarkCleared);
    const statusStacks = updated.statusStacks.filter(
      (stack) =>
        !(removeBleed && stack.kind === "bleed") &&
        !(removeBlight && stack.kind === "blight") &&
        !(removeStunMark && (stack.kind === "stun" || stack.kind === "mark")),
    );
    updated = {
      ...updated,
      statusStacks,
      ...statusProjection(statusStacks, updated.innateProtection),
    };
  }
  return stress === undefined ? updated : { ...updated, stress };
}

/** R20、R-031：仅投影压力快照；位移续接不能重写生命、形态或状态。 */
export function resolveSkillStress(
  entity: BattleEntity,
  actorId: string,
  targetId: string,
  result: HeroSkillResolution,
  selfTarget: boolean,
): number | undefined {
  let stress = entity.stress;
  if (entity.id === actorId) stress = result.actorStress ?? stress;
  if (entity.id === targetId && entity.id !== actorId) stress = result.targetStress ?? stress;
  if (entity.id === actorId && entity.id === targetId && !selfTarget && entity.stress !== undefined)
    stress = Math.max(
      0,
      Math.min(
        10,
        (result.actorStress ?? entity.stress) +
          (result.targetStress ?? entity.stress) -
          entity.stress +
          (result.outcome === "crit" ? 1 : 0),
      ),
    );
  const nearby = [
    ...(result.besideActorStress ?? []),
    ...(result.untargetedBesideTargetStress ?? []),
  ].find((hero) => hero.id === entity.id);
  return nearby?.stress ?? stress;
}
