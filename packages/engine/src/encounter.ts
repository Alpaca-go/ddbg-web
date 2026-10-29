import { rejectBattleCommand } from "./battle";
import type { BattleEntity, BattleState } from "./battle";
import type {
  ApplyResult,
  GameEvent,
  GameState,
  HeroSkillResolvedEvent,
  HeroSkillEmptyAreaResolvedEvent,
  MonsterSkillResolvedEvent,
} from "./command";
import type { SkillStance, SkillTargetSide } from "./hero-skill";
import { createRng } from "./rng";
import { statusStackProblem } from "./status";
import { resolveTurnStartStatus } from "./battle-status";
import { pressureCasualties, resolveBattlePressure } from "./pressure";
import { beginResolveTurn } from "./resolve-trigger";
import { closeBattleLoot, placeBattleLoot } from "./loot";
import { displaceSmallForHero } from "./battle-small";
import { triggerBattlePassive } from "./battle-passive";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal } from "./passive";
import { gainDisease } from "./conditions";
import { applyBattleSkillStatuses, readHeroPassiveDefence } from "./battle-skill-status";
import { applyPassiveHero } from "./passive-runtime";
import { endTurnOldAbbey } from "./battle-old-abbey";
import { endRoundInvocation, isInvokingMonster } from "./battle-invocation";
import { endTurnSpikedPit } from "./battle-spiked-pit";
import { encounterForcesRetreatAfterRound } from "./boss/encounter-rules";
import { applyBossThreatMarkedForDeathOnBattleStart } from "./boss/threat-passive-runtime";
import { applyFanaticIPyreBattleStart } from "./boss/fanatic-i-combat-runtime";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

/** 普通遭遇战；不包含 Boss / 多行动怪物与战役结束规则。 */
export type EncounterState = {
  readonly round: number;
  readonly deck: readonly SkillTargetSide[];
  readonly actedIds: readonly string[];
  readonly turn:
    | { readonly type: "awaitingInitiative" }
    | {
        readonly type: "hero";
        readonly actorId: string;
        readonly actions: number;
        readonly usedSkillIds: readonly string[];
        /** R18：第一行动停在无空间区域后，下一行动必须移动离开。 */
        readonly mustMove?: boolean;
      }
    | { readonly type: "monster"; readonly actorId: string }
    /** 只记录单场全灭事实；驿站 / 任务类型尚未接入，不能判定战役结果。 */
    | {
        readonly type: "halted";
        readonly reason: "heroesDefeated" | "mutualWipeout";
        readonly monstersDefeated: boolean;
      }
    | { readonly type: "finished"; readonly outcome: "victory" | "retreat" };
};

export type EncounterCommand =
  | { readonly type: "startBattle" }
  | { readonly type: "drawInitiative" }
  | {
      readonly type: "changeStance";
      readonly actorId: string;
      readonly direction: "forward" | "backward";
    }
  /** 沙盒手动确认回合边界，不代替尚未接入的怪物 AI。 */
  | { readonly type: "finishMonsterTurn"; readonly actorId: string };

export type EncounterEvent = {
  readonly type:
    | "roundStarted"
    | "turnStarted"
    | "turnEnded"
    | "initiativeDiscarded"
    | "stanceChanged"
    | "casualtyRemoved"
    | "battleHalted"
    | "battleFinished";
  readonly message: string;
  readonly round: number;
  readonly actorId?: string;
  readonly side?: SkillTargetSide;
  readonly outcome?: "victory" | "retreat";
  readonly monstersDefeated?: boolean;
  readonly haltReason?: "heroesDefeated" | "mutualWipeout";
};

export { nextBattleRoll } from "./battle-roll";

function startRound(seed: number, battle: BattleState, round: number): BattleState {
  const deck = battle.entities.filter((entity) => !entity.dead).map((entity) => entity.side);
  const rng = createRng(seed);
  for (let index = 0; index < battle.rngCursor; index += 1) rng.next();
  let cursor = battle.rngCursor;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng.next() * (index + 1));
    [deck[index], deck[other]] = [deck[other]!, deck[index]!];
    cursor += 1;
  }
  return {
    ...battle,
    rngCursor: cursor,
    encounter: { round, deck, actedIds: [], turn: { type: "awaitingInitiative" } },
  };
}

function event(battle: BattleState, type: EncounterEvent["type"], message: string): EncounterEvent {
  return { type, message, round: battle.encounter!.round };
}

function finishBattle(
  state: GameState,
  outcome: "victory" | "retreat",
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!;
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        loot: closeBattleLoot(battle.loot),
        encounter: { ...battle.encounter!, deck: [], turn: { type: "finished", outcome } },
        monsterAction: null,
      },
    },
    events: [
      ...events,
      {
        ...event(
          battle,
          "battleFinished",
          outcome === "victory" ? "怪物全灭，战斗胜利" : "第 4 轮结束，被迫撤退",
        ),
        outcome,
      },
    ],
  };
}

export function finishTurn(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult {
  const small = displaceSmallForHero(state, actorId, events);
  if (small) {
    if (small.pendingChoice || small.events.some((e) => e.type === "commandRefused")) return small;
    state = small.state;
    events = small.events;
  }
  const original = state.battle!;
  const actor = original.entities.find((entity) => entity.id === actorId)!;
  const area = original.areas.find((area) => area.id === actor.areaId);
  if (!actor.dead && actor.side === "hero" && area?.endTurnHeal === 3) {
    const effect = { type: "heal" as const, amount: passiveHeal(actor, 3) };
    const health = resolveHeroHealth(
      { life: actor.life!, wounds: actor.wounds, dead: actor.dead },
      effect,
    );
    if (health.status !== "resolved")
      return rejectBattleCommand(
        state,
        health.status === "refused" ? health.reason : "Healing Waters治疗不应请求死门骰",
      );
    state = {
      ...state,
      battle: {
        ...original,
        entities: original.entities.map((e) =>
          e.id === actorId ? { ...e, wounds: health.state.wounds } : e,
        ),
      },
    };
    events = [
      ...events,
      {
        type: "heroHealthResolved",
        entityId: actorId,
        effect,
        resolution: health,
        message: "Healing Waters：英雄在本面获批泉水区结束回合治疗3（R-065）",
      },
    ];
  }
  if (
    !actor.dead &&
    actor.side === "hero" &&
    (area?.endTurnStress === 1 || area?.endTurnStress === -1)
  ) {
    const name = area.endTurnStressName ?? "Cornered";
    if (!Number.isSafeInteger(actor.stress) || actor.stress! < 0 || actor.stress! > 10)
      return rejectBattleCommand(state, `${name} 缺少已知压力（R-048）`);
    const passive = triggerBattlePassive(state.battle!, state.seed, [actorId], {
      type: "stress",
      amount: area.endTurnStress,
    });
    if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
    const pressure = resolveBattlePressure({
      state: { ...state, battle: passive.battle },
      events: [
        ...events,
        ...passive.events,
        {
          type: "areaStressResolved",
          actorId,
          message: `${name}：英雄结束回合压力 ${area.endTurnStress === 1 ? "+1，低光修正按事件一次" : "−1"}`,
        },
      ],
    });
    if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
    const removed = removeCasualties(pressure, pressureCasualties(original, pressure));
    const ended = endAfterCasualties(removed);
    if (ended) return ended;
    state = removed.state;
    events = removed.events;
  }
  const abbey = endTurnOldAbbey(state, actorId, events);
  if (abbey) {
    if (
      abbey.events.some((e) => e.type === "commandRefused") ||
      abbey.state.battle!.encounter?.turn.type === "halted" ||
      abbey.state.battle!.encounter?.turn.type === "finished"
    )
      return abbey;
    state = abbey.state;
    events = abbey.events;
  }
  const spiked = endTurnSpikedPit(state, actorId, events);
  if (spiked) {
    if (
      spiked.events.some((event) => event.type === "commandRefused") ||
      spiked.state.battle!.encounter?.turn.type === "halted" ||
      spiked.state.battle!.encounter?.turn.type === "finished"
    )
      return spiked;
    state = spiked.state;
    events = spiked.events;
  }
  const battle = state.battle!;
  const encounter = battle.encounter!;
  const actedIds = [...encounter.actedIds, actorId];
  const ended = [...events, { ...event(battle, "turnEnded", "回合结束"), actorId }];
  if (
    encounter.deck.length === 0 ||
    battle.entities.every((entity) => entity.dead || actedIds.includes(entity.id))
  ) {
    const abyss = endRoundInvocation({
      state: { ...state, battle: { ...battle, encounter: { ...encounter, actedIds } } },
      events: ended,
    });
    if (
      abyss.events.some((event) => event.type === "commandRefused") ||
      ["halted", "finished"].includes(abyss.state.battle!.encounter!.turn.type)
    )
      return abyss;
    if (encounterForcesRetreatAfterRound(abyss.state, encounter.round))
      return finishBattle(abyss.state, "retreat", abyss.events);
    const next = startRound(state.seed, abyss.state.battle!, encounter.round + 1);
    return {
      state: { ...abyss.state, battle: next },
      events: [...abyss.events, event(next, "roundStarted", "开始下一轮")],
    };
  }
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        encounter: { ...encounter, actedIds, turn: { type: "awaitingInitiative" } },
      },
    },
    events: ended,
  };
}

/** 状态代币缺 duration 时，不跳过回合开始结算继续运行（R-048）。 */
function unsupportedTurnStart(entity: BattleEntity): boolean {
  if (entity.statusStacks !== undefined)
    return (
      statusStackProblem(entity.statusStacks) !== null ||
      entity.stress === 10 ||
      (entity.side === "hero" &&
        entity.life === undefined &&
        entity.statusStacks.some(
          (stack) => (stack.kind === "bleed" || stack.kind === "blight") && stack.amount! > 0,
        ))
    );
  return (
    entity.bleed.length > 0 ||
    entity.blight.length > 0 ||
    (entity.buffStacks ?? 0) > 0 ||
    (entity.debuffStacks ?? 0) > 0 ||
    (entity.markStacks ?? 0) > 0 ||
    entity.guard ||
    (entity.protection === true && entity.innateProtection !== true) ||
    entity.riposte === true ||
    entity.stress === 10
  );
}

export function encounterSkillProblem(
  battle: BattleState,
  actorId: string,
  skillId: string,
): string | null {
  if (!battle.encounter) return null;
  if (battle.shuffleIntents.length > 0) return "位移意图尚未应用，不能继续遭遇战";
  const turn = battle.encounter.turn;
  if (turn.type !== "hero" || turn.actorId !== actorId || turn.actions <= 0)
    return "当前不是这名英雄的行动回合";
  if (turn.usedSkillIds.includes(skillId)) return "本回合已成功使用该技能（R-025）";
  if (turn.mustMove) return "必须用下一行动离开无空间区域（R18）";
  return null;
}

/** R24–25、R-030：只补本次死亡空位；旧尸体保留日志身份，不再占位。 */
export function removeCasualties(result: ApplyResult, ids: readonly string[]): ApplyResult {
  const battle = result.state.battle!;
  const casualties = battle.entities.filter((entity) => entity.dead && ids.includes(entity.id));
  if (!casualties.length) return result;
  return {
    ...result,
    state: {
      ...result.state,
      battle: {
        ...battle,
        entities: battle.entities.map((entity) => {
          if (entity.dead) return entity;
          const position = STANCES.indexOf(entity.stance!);
          const steps = casualties
            .filter((dead) => dead.side === entity.side && STANCES.indexOf(dead.stance!) < position)
            .reduce((sum, dead) => sum + (dead.side === "hero" ? 1 : dead.stanceSlots!), 0);
          return steps ? { ...entity, stance: STANCES[position - steps]! } : entity;
        }),
      },
    },
    events: [
      ...result.events,
      ...casualties.map((entity) => ({
        ...event(battle, "casualtyRemoved", "阵亡角色退出战场，后方角色只在姿态轨补位"),
        actorId: entity.id,
        side: entity.side,
      })),
    ],
  };
}

export function endAfterCasualties(result: ApplyResult): ApplyResult | null {
  const battle = result.state.battle!;
  const monstersDefeated = battle.entities.every(
    (entity) => entity.side !== "monster" || entity.dead,
  );
  if (battle.entities.every((entity) => entity.side !== "hero" || entity.dead)) {
    return {
      state: {
        ...result.state,
        battle: {
          ...battle,
          loot: closeBattleLoot(battle.loot),
          monsterAction: null,
          encounter: {
            ...battle.encounter!,
            deck: [],
            turn: {
              type: "halted",
              reason: monstersDefeated ? "mutualWipeout" : "heroesDefeated",
              monstersDefeated,
            },
          },
        },
      },
      events: [
        ...result.events,
        {
          ...event(
            battle,
            "battleHalted",
            monstersDefeated
              ? "双方同次全灭：停止单场，无胜利或撤退奖励，不自动判战役失败（R-068）"
              : "英雄全灭，停止单场战斗，等待战役层处理（R25、R-044）",
          ),
          monstersDefeated,
          haltReason: monstersDefeated ? "mutualWipeout" : "heroesDefeated",
        },
      ],
    };
  }
  return monstersDefeated ? finishBattle(result.state, "victory", result.events) : null;
}

/** 技能前后死亡差集；位移待选时保存，续接只应用一次。 */
export function newlyDefeatedIds(battle: BattleState, entities: readonly BattleEntity[]): string[] {
  return entities
    .filter(
      (entity) => entity.dead && !battle.entities.find((before) => before.id === entity.id)!.dead,
    )
    .map((entity) => entity.id);
}

/** 技能成功才锁定重用；落空仍消耗一个行动（R18–19、R-025）。 */
export function recordEncounterSkill(
  result: ApplyResult,
  resolved:
    HeroSkillResolvedEvent | HeroSkillEmptyAreaResolvedEvent | undefined = result.events.find(
    (entry) => entry.type === "heroSkillResolved",
  ),
  casualtyIds: readonly string[] = [],
): ApplyResult {
  const battle = result.state.battle;
  if (!battle?.encounter) return result;
  if (!resolved || battle.encounter.turn.type !== "hero") return result;
  const pressure = resolveBattlePressure(result);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const removed = removeCasualties(pressure, [
    ...casualtyIds,
    ...pressureCasualties(battle, pressure),
    ...(resolved.type === "heroSkillResolved" && resolved.resolution.targetDead
      ? [resolved.resolution.targetId]
      : []),
  ]);
  const ended = endAfterCasualties(removed);
  if (ended) return ended;
  const state = removed.state;
  const next = state.battle!;
  const turn = battle.encounter.turn;
  const usedSkillIds =
    resolved.type === "heroSkillResolved" && resolved.resolution.outcome === "miss"
      ? turn.usedSkillIds
      : [
          ...turn.usedSkillIds,
          resolved.type === "heroSkillResolved" ? resolved.resolution.skillId : resolved.skillId,
        ];
  const actions = turn.actions - 1;
  if (actions === 0 || next.entities.find((entity) => entity.id === turn.actorId)!.dead)
    return finishTurn(state, turn.actorId, removed.events);
  return {
    ...removed,
    state: {
      ...state,
      battle: {
        ...next,
        encounter: { ...next.encounter!, turn: { ...turn, actions, usedSkillIds } },
      },
    },
  };
}

/** 已选怪物技能结算完毕才结束回合；反弹死亡按 R24–25 补姿态空位。 */
export function recordMonsterSkill(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
  casualtyIds: readonly string[] = [],
  conditionsDone = false,
  remainingInfections?: readonly import("./hero-skill").HeroSkillResolution[],
): ApplyResult {
  if (!conditionsDone) {
    const initial = result.state.battle!;
    const targets = result.events.flatMap((e) =>
      e.type === "monsterSkillTargetsResolved"
        ? e.resolutions
        : e.type === "monsterSkillResolved"
          ? [e.resolution]
          : [],
    );
    // 第四怪癖待选保留未处理目标，已完成的光照/压力/感染不重付。
    const selectedInfections =
      remainingInfections ??
      (targets.length
        ? targets.filter((r) => r.targetDisease)
        : resolved.resolution.targetDisease
          ? [resolved.resolution]
          : []);
    const infections =
      !remainingInfections && selectedInfections.some((r) => r.orderedMonsterTargetEffects)
        ? [...selectedInfections].sort(
            (a, b) =>
              STANCES.indexOf(initial.entities.find((e) => e.id === a.targetId)!.stance!) -
              STANCES.indexOf(initial.entities.find((e) => e.id === b.targetId)!.stance!),
          )
        : selectedInfections;
    let next = initial;
    const events: GameEvent[] = [...result.events];
    const settlePressure = (): string | null => {
      const pressure = resolveBattlePressure({
        state: { ...result.state, battle: next },
        events: [],
      });
      const refused = pressure.events.find((e) => e.type === "commandRefused");
      if (refused) return refused.message;
      next = pressure.state.battle!;
      events.push(...pressure.events);
      return null;
    };
    // R-084：先完成全部攻击/暴击压力，再逐名进入目标效果；续接不重复攻击阶段。
    if (!remainingInfections && infections.some((r) => r.orderedMonsterTargetEffects)) {
      const problem = settlePressure();
      if (problem) return rejectBattleCommand(result.state, problem);
    }
    for (const [infectionIndex, resolution] of infections.entries()) {
      let hero = next.entities.find((e) => e.id === resolution.targetId)!;
      if (hero.dead) continue;
      const ordered = resolution.orderedMonsterTargetEffects;
      if (ordered) {
        const light = applyBattleSkillStatuses(
          next,
          next.entities,
          resolved.actorId,
          [
            {
              ...resolution,
              actorLightDelta: 0,
              targetLightDelta: ordered.light,
              actorStatusEffects: [],
              targetStatusEffects: [],
            },
          ],
          result.state.seed,
          next.rngCursor,
        );
        if (light.status === "refused") return rejectBattleCommand(result.state, light.reason);
        next = {
          ...next,
          entities: light.entities,
          light: light.light,
          rngCursor: light.rngCursor,
        };
        events.push(...light.events);
        const lightProblem = settlePressure();
        if (lightProblem) return rejectBattleCommand(result.state, lightProblem);
        hero = next.entities.find((e) => e.id === resolution.targetId)!;
        if (hero.dead) continue;
        const stress = applyPassiveHero(
          hero,
          { type: "stress", amount: ordered.stress },
          result.state.seed,
          next.rngCursor,
          next.light,
          next.provisions,
          readHeroPassiveDefence(next, hero),
        );
        if (stress.status === "refused") return rejectBattleCommand(result.state, stress.reason);
        next = {
          ...next,
          entities: next.entities.map((e) => (e.id === hero.id ? stress.hero : e)),
          rngCursor: stress.cursor,
          provisions: stress.provisions,
        };
        events.push(...stress.events, {
          type: "monsterTargetEffectsResolved",
          entityId: hero.id,
          light: next.light,
          stress: stress.hero.stress!,
          message: `Howl：光照降至${next.light}，目标压力${stress.hero.stress}`,
        });
        const stressProblem = settlePressure();
        if (stressProblem) return rejectBattleCommand(result.state, stressProblem);
        hero = next.entities.find((e) => e.id === resolution.targetId)!;
        if (hero.dead) continue;
      }
      if (!next.conditions || !readHeroPassiveDefence(next, hero))
        return rejectBattleCommand(
          result.state,
          "疾病需要完整实体牌堆与已核实免疫栏（R27、R-048）",
        );
      if (readHeroPassiveDefence(next, hero)?.diseaseImmune) {
        events.push({
          type: "passiveTriggered",
          entityId: hero.id,
          trigger: "diseaseImmunity",
          message: "免疫本次疾病；保留已有疾病，不抽牌或推进RNG（R21、R-081）",
        });
        continue;
      }
      const acquired = gainDisease(
        next.conditions,
        next.entities.filter((e) => e.side === "hero"),
        hero.id,
        result.state.seed,
        next.rngCursor,
      );
      if (acquired.status === "refused") return rejectBattleCommand(result.state, acquired.reason);
      next = {
        ...next,
        conditions: acquired.pool,
        rngCursor: acquired.cursor,
        entities: next.entities.map((e) => acquired.heroes.find((h) => h.id === e.id) ?? e),
      };
      events.push({
        type: "diseaseAcquired",
        entityId: hero.id,
        diseaseId: acquired.diseaseId,
        ...(acquired.quirkId ? { quirkId: acquired.quirkId } : {}),
        message: "疾病已抽取；重复感染替换旧病并获得负面怪癖（R26–27）",
      });
      if (acquired.replaceOptions?.length) {
        const choice = {
          id: `condition-replace:${next.choiceCursor}:${hero.id}`,
          actorId: hero.id,
          prompt: "获得第四个怪癖：选择替换一张已有正面怪癖",
          options: acquired.replaceOptions.map((id) => ({
            id,
            label: next.conditions!.quirks.find((c) => c.id === id)!.name,
          })),
        };
        return {
          state: {
            ...result.state,
            battle: {
              ...next,
              choiceCursor: next.choiceCursor + 1,
              pending: {
                type: "conditionReplace",
                choice,
                resolved,
                events,
                remainingInfections: infections.slice(infectionIndex + 1),
                casualtyIds: [
                  ...new Set([...casualtyIds, ...newlyDefeatedIds(initial, next.entities)]),
                ],
              },
            },
          },
          events,
          pendingChoice: choice,
        };
      }
    }
    casualtyIds = [...new Set([...casualtyIds, ...newlyDefeatedIds(initial, next.entities)])];
    result = { ...result, state: { ...result.state, battle: next }, events };
  }
  const battle = result.state.battle;
  if (!battle?.encounter || battle.encounter.turn.type !== "monster") return result;
  const pressure = resolveBattlePressure(result);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const removed = removeCasualties(pressure, [
    ...casualtyIds,
    ...pressureCasualties(battle, pressure),
    ...(resolved.actorDead ? [resolved.actorId] : []),
  ]);
  return endAfterCasualties(removed) ?? finishTurn(removed.state, resolved.actorId, removed.events);
}

/** 意志触发（含待选补给）完成后，只执行一次压力、状态与死亡收尾。 */
export function completeTurnStart(result: ApplyResult, actorId: string): ApplyResult {
  const before = result.state.battle!;
  const pressure = resolveBattlePressure(result);
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const battle = pressure.state.battle!;
  const actor = battle.entities.find((entity) => entity.id === actorId)!;
  const status = actor.dead
    ? {
        status: "resolved" as const,
        entity: actor,
        rngCursor: battle.rngCursor,
        events: [],
        stunned: false,
      }
    : resolveTurnStartStatus(actor, pressure.state.seed, battle.rngCursor);
  if (status.status === "refused") return rejectBattleCommand(result.state, status.reason);
  const turn = battle.encounter!.turn;
  const started: ApplyResult = {
    state: {
      ...pressure.state,
      battle: {
        ...battle,
        entities: battle.entities.map((entity) => (entity.id === actorId ? status.entity : entity)),
        rngCursor: status.rngCursor,
        encounter: {
          ...battle.encounter!,
          turn: turn.type === "hero" ? { ...turn, actions: status.stunned ? 1 : 2 } : turn,
        },
      },
    },
    events: [...pressure.events, ...status.events],
  };
  const triggerDeaths = pressure.events.flatMap((event) =>
    event.type === "heroHealthResolved" && event.resolution.deathblow ? [event.entityId] : [],
  );
  const removed = removeCasualties(
    started,
    [
      ...pressureCasualties(before, pressure),
      ...triggerDeaths,
      ...(status.entity.dead ? [actorId] : []),
    ].filter((id, index, ids) => ids.indexOf(id) === index),
  );
  return (
    endAfterCasualties(removed) ??
    (status.entity.dead || (actor.side === "monster" && status.stunned)
      ? finishTurn(removed.state, actorId, removed.events)
      : removed)
  );
}

export function applyEncounterCommand(state: GameState, command: EncounterCommand): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  if (battle.shuffleIntents.length > 0)
    return rejectBattleCommand(state, "位移意图尚未应用，不能继续遭遇战");
  if (command.type === "startBattle") {
    if (battle.encounter) return rejectBattleCommand(state, "遭遇战已经开始");
    if (
      battle.entities.some(
        (entity) => entity.side === "hero" && !entity.dead && entity.stress === 10,
      )
    ) {
      const pressure = resolveBattlePressure({ state, events: [] });
      if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
      const started = applyEncounterCommand(pressure.state, command);
      return { ...started, events: [...pressure.events, ...started.events] };
    }
    const living = battle.entities.filter((entity) => !entity.dead);
    if (living.filter((entity) => entity.side === "hero").length !== 4)
      return rejectBattleCommand(state, "普通遭遇战需要 4 名存活英雄（R16）");
    for (const side of ["hero", "monster"] as const) {
      const occupied = new Set<number>();
      for (const entity of living.filter((entry) => entry.side === side)) {
        const width = side === "hero" ? 1 : entity.stanceSlots;
        const position = STANCES.indexOf(entity.stance!);
        if (position < 0 || (width !== 1 && width !== 2) || position + width > 4)
          return rejectBattleCommand(state, "姿态或怪物占格数尚未核实 / 超出轨道");
        for (let slot = position; slot < position + width; slot += 1) {
          if (occupied.has(slot)) return rejectBattleCommand(state, "同阵营姿态位重叠");
          occupied.add(slot);
        }
      }
    }
    if (!living.some((entity) => entity.side === "monster")) {
      return finishBattle(
        {
          ...state,
          battle: {
            ...battle,
            encounter: { round: 1, deck: [], actedIds: [], turn: { type: "awaitingInitiative" } },
          },
        },
        "victory",
        [],
      );
    }
    if (living.some(unsupportedTurnStart))
      return rejectBattleCommand(state, "回合开始状态 / 压力检定尚未接入（R-048）");
    const marked = applyBossThreatMarkedForDeathOnBattleStart(state);
    if (marked.events.some((entry) => entry.type === "commandRefused"))
      return { state, events: marked.events };
    const pyre = applyFanaticIPyreBattleStart(marked.state);
    if (pyre.events.some((entry) => entry.type === "commandRefused"))
      return { state, events: [...marked.events, ...pyre.events] };
    const deployed = placeBattleLoot(pyre.state.battle!, state.seed);
    if (!deployed)
      return rejectBattleCommand(state, "战利品池必须保留十枚真实实例的可用 / 已拾取分区");
    const next = startRound(state.seed, deployed, 1);
    return {
      state: { ...pyre.state, battle: next },
      events: [...marked.events, ...pyre.events, event(next, "roundStarted", "开始第 1 轮")],
    };
  }
  const encounter = battle.encounter;
  if (!encounter || encounter.turn.type === "finished" || encounter.turn.type === "halted")
    return rejectBattleCommand(state, "遭遇战尚未开始或已经结束");
  if (command.type === "drawInitiative") {
    if (encounter.turn.type !== "awaitingInitiative")
      return rejectBattleCommand(state, "当前回合尚未结束");
    const events: GameEvent[] = [];
    const deck = [...encounter.deck];
    while (deck.length > 0) {
      const side = deck.shift()!;
      const actor = battle.entities
        .filter(
          (entity) =>
            !entity.dead && entity.side === side && !encounter.actedIds.includes(entity.id),
        )
        .sort((left, right) => STANCES.indexOf(left.stance!) - STANCES.indexOf(right.stance!))[0];
      if (!actor) {
        events.push({
          ...event(battle, "initiativeDiscarded", "对应阵营没有可行动角色，弃掉先攻卡"),
          side,
        });
        continue;
      }
      if (unsupportedTurnStart(actor))
        return rejectBattleCommand(state, "回合开始状态 / 压力检定尚未接入（R-048）");
      const turn: EncounterState["turn"] =
        side === "hero"
          ? { type: "hero", actorId: actor.id, actions: 2, usedSkillIds: [] }
          : { type: "monster", actorId: actor.id };
      if (battle.provisionWindows) {
        const choice = {
          id: `turn-start:${battle.choiceCursor}`,
          prompt: "回合开始前：可免费使用补给，完成后结算触发与状态",
          options: [{ id: "continue", label: "结算回合开始效果" }],
        };
        return {
          state: {
            ...state,
            battle: {
              ...battle,
              choiceCursor: battle.choiceCursor + 1,
              encounter: { ...encounter, deck, turn },
              pending: { type: "turnStartProvision", actorId: actor.id, choice },
            },
          },
          events: [
            ...events,
            {
              ...event(battle, "turnStarted", "先攻确定，等待回合开始效果"),
              actorId: actor.id,
              side,
            },
          ],
          pendingChoice: choice,
        };
      }
      return beginResolveTurn(
        {
          state: { ...state, battle: { ...battle, encounter: { ...encounter, deck, turn } } },
          events: [
            ...events,
            { ...event(battle, "turnStarted", "按当前姿态开始回合"), actorId: actor.id, side },
          ],
        },
        actor.id,
      );
    }
    const abyss = endRoundInvocation({ state, events });
    if (
      abyss.events.some((event) => event.type === "commandRefused") ||
      ["halted", "finished"].includes(abyss.state.battle!.encounter!.turn.type)
    )
      return abyss;
    if (encounterForcesRetreatAfterRound(abyss.state, encounter.round))
      return finishBattle(abyss.state, "retreat", abyss.events);
    const next = startRound(state.seed, abyss.state.battle!, encounter.round + 1);
    return {
      state: { ...state, battle: next },
      events: [...abyss.events, event(next, "roundStarted", "开始下一轮")],
    };
  }
  if (command.type === "finishMonsterTurn") {
    if (isInvokingMonster(battle, command.actorId))
      return rejectBattleCommand(state, "The Invokers 移动尚未完成，不能直接结束第2步");
    if (encounter.turn.type !== "monster" || encounter.turn.actorId !== command.actorId)
      return rejectBattleCommand(state, "当前不是这只怪物的回合");
    return finishTurn(
      { ...state, battle: { ...battle, monsterAction: null } },
      command.actorId,
      [],
    );
  }
  const turn = encounter.turn;
  if (command.direction !== "forward" && command.direction !== "backward") {
    return rejectBattleCommand(state, "换姿态方向必须是 forward 或 backward");
  }
  if (turn.type !== "hero" || turn.actorId !== command.actorId)
    return rejectBattleCommand(state, "当前不是这名英雄的行动回合");
  if (turn.mustMove) return rejectBattleCommand(state, "必须用下一行动离开无空间区域（R18）");
  const actor = battle.entities.find((entity) => entity.id === command.actorId)!;
  const position = STANCES.indexOf(actor.stance!);
  const nextPosition = position + (command.direction === "forward" ? -1 : 1);
  const stance = STANCES[nextPosition];
  const other = battle.entities.find(
    (entity) => entity.side === "hero" && !entity.dead && entity.stance === stance,
  );
  if (!stance || !other) return rejectBattleCommand(state, "换姿态必须和相邻英雄交换（R19）");
  const next: GameState = {
    ...state,
    battle: {
      ...battle,
      entities: battle.entities.map((entity) =>
        entity.id === actor.id
          ? { ...entity, stance }
          : entity.id === other.id
            ? { ...entity, stance: actor.stance! }
            : entity,
      ),
      encounter: { ...encounter, turn: { ...turn, actions: turn.actions - 1 } },
    },
  };
  const events = [
    { ...event(battle, "stanceChanged", "与相邻英雄交换姿态，棋子区域不变"), actorId: actor.id },
  ];
  return turn.actions === 1 ? finishTurn(next, actor.id, events) : { state: next, events };
}
