import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState, GameEvent } from "./command";
import type { BattleState } from "./battle";
import { completeTurnStart, nextBattleRoll } from "./encounter";
import { resolveSeededHeroHealth } from "./hero-health";
import { statusProjection, statusStackProblem } from "./status";
import { triggerBattlePassive } from "./battle-passive";
import { healingForbidden } from "./battle-healing";
import { passiveHeal } from "./passive";

/** R18 / R28：意志卡先触发，状态堆随后弹出；玩家选择只续接，不重掷触发骰。 */
export function beginResolveTurn(result: ApplyResult, actorId: string): ApplyResult {
  const battle = result.state.battle!;
  const actor = battle.entities.find((entity) => entity.id === actorId)!;
  if (actor.side !== "hero" || !actor.resolveCardId) return completeTurnStart(result, actorId);
  const card = battle.resolveCards?.find((card) => card.id === actor.resolveCardId);
  const trigger = card?.verified_turn_start;
  if (
    !card ||
    card.verification.unverified ||
    !trigger ||
    trigger.rollMin !== 1 ||
    !Number.isInteger(trigger.rollMax) ||
    trigger.rollMax < 1 ||
    trigger.rollMax > 10
  )
    return rejectBattleCommand(result.state, "缺少完整获批的意志卡回合开始效果（R-048）");
  const roll = nextBattleRoll(result.state.seed, battle.rngCursor);
  const events: GameEvent[] = [
    ...result.events,
    {
      type: "resolveTriggered" as const,
      entityId: actorId,
      cardId: card.id,
      roll,
      triggered: roll <= trigger.rollMax,
      message: `${card.name ?? card.id} 回合开始骰 ${roll}`,
    },
  ];
  let next: BattleState = { ...battle, rngCursor: battle.rngCursor + 1 };
  const finish = (): ApplyResult =>
    completeTurnStart({ state: { ...result.state, battle: next }, events }, actorId);
  if (roll === 1 || roll === 10) {
    const passive = triggerBattlePassive(
      next,
      result.state.seed,
      [actorId],
      roll === 10 ? "rolledTen" : "rolledOne",
    );
    if (passive.status === "refused") return rejectBattleCommand(result.state, passive.reason);
    next = passive.battle;
    events.push(...passive.events);
    if (next.entities.find((e) => e.id === actorId)!.dead) return finish();
  }
  if (roll > trigger.rollMax) return finish();
  const effect = trigger.effect;
  if (effect.type === "stress" || effect.type === "buff") {
    const recipients = next.entities.filter(
      (entity) =>
        entity.side === "hero" &&
        !entity.dead &&
        (effect.scope === "heroes" || entity.id === actorId),
    );
    if (
      effect.type === "stress" &&
      (!Number.isSafeInteger(effect.amount) ||
        recipients.some(
          (entity) =>
            !Number.isSafeInteger(entity.stress) || entity.stress! < 0 || entity.stress! > 10,
        ))
    )
      return rejectBattleCommand(result.state, "意志压力数值无效（R-048）");
    if (
      effect.type === "buff" &&
      (!Number.isSafeInteger(effect.duration) ||
        effect.duration <= 0 ||
        recipients.some(
          (entity) =>
            statusStackProblem(entity.statusStacks ?? []) !== null ||
            (entity.statusStacks === undefined &&
              (entity.bleed.length ||
                entity.blight.length ||
                entity.buffStacks ||
                entity.debuffStacks ||
                entity.markStacks ||
                entity.guard ||
                entity.riposte ||
                (entity.protection && !entity.innateProtection))),
        ))
    )
      return rejectBattleCommand(result.state, "意志 Buff 缺 duration 或已有状态缺完整堆（R-048）");
    if (effect.type === "stress") {
      const passive = triggerBattlePassive(
        next,
        result.state.seed,
        recipients.map((e) => e.id),
        { type: "stress", amount: effect.amount },
      );
      if (passive.status === "refused") return rejectBattleCommand(result.state, passive.reason);
      next = passive.battle;
      events.push(...passive.events);
      return finish();
    }
    next = {
      ...next,
      entities: next.entities.map((entity) => {
        if (!recipients.some((recipient) => recipient.id === entity.id)) return entity;
        const stacks = [
          ...(entity.statusStacks ?? []),
          { kind: "buff" as const, remaining: effect.duration },
        ];
        return {
          ...entity,
          statusStacks: stacks,
          ...statusProjection(stacks, entity.innateProtection),
        };
      }),
    };
    return finish();
  }
  if (effect.type === "heal" || effect.type === "wounds") {
    if (
      !Number.isSafeInteger(actor.heroLevel) ||
      actor.heroLevel! < 1 ||
      actor.heroLevel! > 3 ||
      !Number.isSafeInteger(effect.amount) ||
      effect.amount <= 0 ||
      actor.life === undefined ||
      effect.perHeroLevel !== true
    )
      return rejectBattleCommand(
        result.state,
        "意志生命效果缺已核实 Hero Level / Life / 数值（R-048）",
      );
    if (effect.type === "heal" && healingForbidden(next, actorId)) {
      events.push({
        type: "healingPrevented",
        entityId: actorId,
        message: "Unholy Aura：意志治疗已阻止（R-067）",
      });
      return finish();
    }
    const healthEffect =
      effect.type === "heal"
        ? { type: "heal" as const, amount: passiveHeal(actor, effect.amount * actor.heroLevel!) }
        : { type: "wounds" as const, amounts: [effect.amount * actor.heroLevel!] };
    const health = resolveSeededHeroHealth(
      {
        life: actor.life,
        wounds: next.entities.find((e) => e.id === actorId)!.wounds,
        dead: false,
      },
      healthEffect,
      result.state.seed,
      next.rngCursor,
    );
    if (health.status !== "resolved")
      return rejectBattleCommand(
        result.state,
        health.status === "refused" ? health.reason : "意志生命效果未完成",
      );
    next = {
      ...next,
      rngCursor: health.rngCursor,
      entities: next.entities.map((entity) =>
        entity.id === actorId ? { ...entity, ...health.state } : entity,
      ),
    };
    events.push({
      type: "heroHealthResolved",
      message: "意志卡生命效果已结算",
      entityId: actorId,
      effect: healthEffect,
      resolution: health,
    });
    return finish();
  }
  if (effect.type === "stanceMove") {
    if (effect.distance !== 1 || effect.forwardThrough !== 5)
      return rejectBattleCommand(result.state, "未支持的意志姿态数值（R-048）");
    const heroes = next.entities.filter((entity) => entity.side === "hero" && !entity.dead);
    const stances = ["aggressive", "defensive", "ranged", "support"] as const;
    const position = stances.indexOf(actor.stance!);
    const destination = position + (roll <= effect.forwardThrough ? -1 : 1);
    if (destination < 0 || destination >= heroes.length) return finish(); // R-057：尽头不移动。
    const stance = stances[destination]!;
    const other = heroes.find((entity) => entity.stance === stance);
    if (!other) return rejectBattleCommand(result.state, "意志姿态轨有空隙，不能猜交换对象");
    next = {
      ...next,
      entities: next.entities.map((entity) =>
        entity.id === actorId
          ? { ...entity, stance }
          : entity.id === other.id
            ? { ...entity, stance: actor.stance! }
            : entity,
      ),
    };
    return finish();
  }
  if (effect.type !== "consumeProvision" || effect.amount !== 1)
    return rejectBattleCommand(result.state, "未知意志触发效果（R-048）");
  const provisions = next.provisions;
  const labels = { food: "食物", bandage: "绷带", potion: "药水", torch: "火把", tool: "工具" };
  if (
    !provisions ||
    provisions.length > 16 ||
    new Set(provisions.map((provision) => provision.id)).size !== provisions.length ||
    provisions.some((provision) => !provision.id || !Object.hasOwn(labels, provision.face))
  )
    return rejectBattleCommand(result.state, "Selfish 缺已知补给池或池无效（R-048）");
  if (provisions.length === 0) return finish(); // R-057。
  const choice = {
    id: `resolve-provision:${next.choiceCursor}:${actorId}`,
    actorId,
    prompt: "Selfish：选择消耗一颗补给",
    options: provisions.map((provision) => ({ id: provision.id, label: labels[provision.face] })),
  };
  next = {
    ...next,
    choiceCursor: next.choiceCursor + 1,
    pending: { type: "resolveProvision", choice, actorId },
  };
  return { state: { ...result.state, battle: next }, events, pendingChoice: choice };
}

export function consumeResolveProvision(state: GameState, provisionId: string): ApplyResult {
  const battle = state.battle!;
  const pending = battle.pending;
  if (
    pending?.type !== "resolveProvision" ||
    !battle.provisions?.some((provision) => provision.id === provisionId)
  )
    return rejectBattleCommand(state, "补给选择已失效");
  let result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...battle,
        pending: null,
        provisions: battle.provisions.filter((provision) => provision.id !== provisionId),
      },
    },
    events: [
      {
        type: "provisionConsumed",
        entityId: pending.actorId,
        provisionId,
        face: battle.provisions!.find((provision) => provision.id === provisionId)!.face,
        effect: "discard",
        message: "Selfish 已消耗补给，不执行该补给通常效果",
      },
    ],
  };
  if (battle.provisions!.find((p) => p.id === provisionId)!.face === "food") {
    const passive = triggerBattlePassive(
      result.state.battle!,
      state.seed,
      [pending.actorId],
      "foodConsumed",
    );
    if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
    result = {
      ...result,
      state: { ...result.state, battle: passive.battle },
      events: [...result.events, ...passive.events],
    };
  }
  return completeTurnStart(result, pending.actorId);
}
