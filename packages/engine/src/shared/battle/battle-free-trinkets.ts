import {
  CORE_TRINKET_BINDINGS,
  hasReviewedCoreTrinketIdentity,
} from "../../../../data/src/core/trinkets/core-trinket-bindings";
import { battleTrinketHolders } from "./battle-hero-card-holders";
import type { GameState, ApplyResult, GameEvent } from "../core/command";
import { rejectBattleCommand } from "./battle";
import { triggerBattlePassive } from "./battle-passive";
import { trinketPoolProblem } from "../trinkets/trinket-acquisition";
import { resolveBattlePressure } from "../core/pressure";
import { resolveSeededHeroHealth } from "../../core/heroes/hero-health";
import { healingForbidden } from "./battle-healing";
import { passiveDamageWounds, passiveHeal } from "../core/passive";
import { statusProjection } from "../core/status";
import { finalizeFreeTrinketDuringMonsterTurn } from "./battle-monster-retarget";
import { resolveAttackDamage } from "../core/attack-damage";
import { damageTrinketReaction } from "../trinkets/trinket-reactions";
import { useCoreTrinket } from "../trinkets/core-trinket-free";

export const FREE_TRINKET_IDS = [
  "trinket:p015",
  "trinket:p017",
  "trinket:p018",
  "trinket:p027",
  "trinket:p028",
  "trinket:p030",
  "trinket:p035",
  "trinket:p036",
  "trinket:p037",
  "trinket:p038",
] as const;
export type FreeTrinketId = (typeof FREE_TRINKET_IDS)[number];
/** 反面在角色回合间隙可 `useTrinket`；与 core-trinket-free `freeFaces` 主动面一致。 */
export const FREE_TRINKET_INVERTED_ACTIVE_USE = [
  "trinket:p027",
  "trinket:p030",
  "trinket:p036",
  "trinket:p037",
  "trinket:p038",
] as const satisfies readonly FreeTrinketId[];
/** 反面已在受击/防御窗（defenceTrinketReaction）接通，不接受独立 useTrinket。 */
export const FREE_TRINKET_INVERTED_DEFENCE_REACTION = [
  "trinket:p015",
  "trinket:p017",
  "trinket:p018",
] as const satisfies readonly FreeTrinketId[];
export function isFreeTrinketId(id: string): id is FreeTrinketId {
  return (FREE_TRINKET_IDS as readonly string[]).includes(id);
}
export function freeTrinketUseProblem(
  state: GameState,
  actorId: string,
  id: FreeTrinketId,
): string | null {
  const b = state.battle,
    turn = b?.encounter?.turn;
  if (
    !b ||
    !turn ||
    !["hero", "monster"].includes(turn.type) ||
    (state.dungeon && state.dungeon.phase !== "inBattle") ||
    b.pending ||
    b.skillPrefix ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    (turn.type === "monster" && !b.monsterAction?.positioned)
  )
    return "需要角色回合内完整效果间隙（R26）";
  const actor = b.entities.find((e) => e.id === actorId && e.side === "hero" && !e.dead);
  if (!actor || !Number.isSafeInteger(actor.stress) || actor.stress! < 0 || actor.stress! >= 10)
    return "持有者或压力无效（R-048）";
  const pool = b.trinkets;
  if (!pool) return "缺少饰品牌池";
  const problem = trinketPoolProblem(pool, battleTrinketHolders(b));
  if (problem) return problem;
  const card = pool.cards.find((c) => c.id === id),
    held = pool.held.find((h) => h.cardId === id && h.heroId === actorId);
  if (!hasReviewedCoreTrinketIdentity(card, id)) return "饰品卡面发生变化（R-048）";
  if (!held || b.usedTrinketIds?.includes(id)) return "未持有或本角色回合已使用（R26、R-028）";
  if (held.face === "inverted") {
    if (id === "trinket:p028" || id === "trinket:p035")
      return "此反面须在意志骰结果确定前的饰品选择中使用，不接受免费翻面（R26）";
    if ((FREE_TRINKET_INVERTED_DEFENCE_REACTION as readonly string[]).includes(id))
      return "此反面在受击防御窗选用，不可用独立命令（R26、R-048）";
    if (!(FREE_TRINKET_INVERTED_ACTIVE_USE as readonly string[]).includes(id))
      return "此反面所需时点尚未接通（R-048）";
  }
  if (held.face === "upright") {
    if ((id === "trinket:p028" && b.light > 3) || (id === "trinket:p035" && b.light < 3))
      return "光照不满足卡面条件";
    if (id === "trinket:p027" && (turn.type !== "hero" || turn.actorId !== actorId))
      return "只能给当前行动英雄增加行动";
    if (id === "trinket:p015" && !b.provisions?.some((p) => p.face === "food"))
      return "需要消耗一颗食物补给";
  }
  return null;
}
export function useFreeTrinket(
  state: GameState,
  command: { actorId: string; cardId: FreeTrinketId; allTrinkets?: true | undefined },
): ApplyResult {
  const { actorId, cardId } = command;
  const problem = freeTrinketUseProblem(state, actorId, cardId);
  if (problem) return rejectBattleCommand(state, problem);
  if (
    command.cardId === "trinket:p038" &&
    state.battle!.trinkets!.held.find((h) => h.cardId === command.cardId)?.face === "inverted"
  )
    return useCoreTrinket(state, {
      type: "useCoreTrinket",
      actorId: command.actorId,
      cardId: command.cardId,
    });
  const before = state.battle!,
    turn = before.encounter!.turn;
  let b = before;
  const events: GameEvent[] = [];
  const actor = b.entities.find((e) => e.id === actorId)!;
  const held = b.trinkets!.held.find((h) => h.cardId === cardId)!;
  const upright = held.face === "upright";
  const stresses: Partial<Record<FreeTrinketId, number>> = {
    "trinket:p017": -3,
    "trinket:p018": -2,
    "trinket:p028": -9,
    "trinket:p035": -3,
    "trinket:p036": -4,
  };
  const stress = upright
    ? stresses[cardId]
    : cardId === "trinket:p030"
      ? 2
      : cardId === "trinket:p027"
        ? 1
        : undefined;
  if (stress !== undefined) {
    const paid = triggerBattlePassive(b, state.seed, [actorId], { type: "stress", amount: stress });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    b = paid.battle;
    events.push(...paid.events);
  }
  if (upright && cardId === "trinket:p027" && turn.type === "hero")
    b = { ...b, encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions + 1 } } };
  if (upright && cardId === "trinket:p038")
    b = {
      ...b,
      entities: b.entities.map((e) => {
        if (e.side !== "hero" || e.dead) return e;
        // 只清除卡面指定五种；保留 Protection 等其它状态。
        const stacks = (e.statusStacks ?? []).filter(
          (s) => !["bleed", "blight", "debuff", "stun", "mark"].includes(s.kind),
        );
        return { ...e, statusStacks: stacks, ...statusProjection(stacks, e.innateProtection) };
      }),
    };
  if (upright && ["trinket:p015", "trinket:p030", "trinket:p037"].includes(cardId)) {
    const targets = b.entities.filter(
      (e) =>
        e.side === "hero" &&
        !e.dead &&
        (cardId === "trinket:p037" ? e.areaId === actor.areaId : e.id === actorId),
    );
    for (const hero of targets) {
      if (healingForbidden(b, hero.id)) {
        events.push({
          type: "healingPrevented",
          entityId: hero.id,
          message: "当前区域禁止治疗（R-067）",
        });
        continue;
      }
      if (hero.life === undefined || hero.wounds === undefined)
        return rejectBattleCommand(state, "治疗缺少生命或伤口");
      const effect = {
        type: "heal" as const,
        amount: passiveHeal(
          hero,
          cardId === "trinket:p015" ? 10 : cardId === "trinket:p030" ? 9 : 6,
        ),
      };
      const health = resolveSeededHeroHealth(
        { life: hero.life, wounds: hero.wounds, dead: hero.dead },
        effect,
        state.seed,
        b.rngCursor,
      );
      if (health.status !== "resolved") return rejectBattleCommand(state, "治疗无法结算");
      b = {
        ...b,
        rngCursor: health.rngCursor,
        entities: b.entities.map((e) => (e.id === hero.id ? { ...e, ...health.state } : e)),
      };
      events.push({
        type: "heroHealthResolved",
        entityId: hero.id,
        effect,
        resolution: health,
        message: "饰品治疗（R26、R29）",
      });
    }
    if (cardId === "trinket:p015") {
      const food = b.provisions!.find((p) => p.face === "food")!;
      b = { ...b, provisions: b.provisions!.filter((p) => p.id !== food.id) };
    }
  }
  if (!upright && cardId === "trinket:p037") b = { ...b, light: Math.max(0, b.light - 2) };
  if (!upright && cardId === "trinket:p036") {
    const hero = b.entities.find((e) => e.id === actorId)!;
    const damage = resolveAttackDamage(hero, 6, false, false).damageDealt;
    const wounds =
      damage > 0 ? damageTrinketReaction(b, actorId, [damage, ...passiveDamageWounds(hero)]) : [];
    if (wounds.length) {
      const paid = triggerBattlePassive(b, state.seed, [actorId], {
        type: "stress",
        amount: 0,
        woundAmounts: wounds,
      });
      if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
      b = paid.battle;
      events.push(...paid.events);
    }
    if (damage > 0 && !b.entities.find((e) => e.id === actorId)!.dead) {
      const taken = triggerBattlePassive(b, state.seed, [actorId], "damageTaken");
      if (taken.status === "refused") return rejectBattleCommand(state, taken.reason);
      b = taken.battle;
      events.push(...taken.events);
    }
  }
  b = {
    ...b,
    usedTrinketIds: [...(b.usedTrinketIds ?? []), cardId],
    trinkets: {
      ...b.trinkets!,
      held: b.trinkets!.held.map((h) =>
        h.cardId === cardId
          ? { ...h, face: upright ? ("inverted" as const) : ("upright" as const) }
          : h,
      ),
    },
  };
  events.push({
    type: "trinketUsed",
    actorId,
    cardId,
    face: held.face,
    message: CORE_TRINKET_BINDINGS[cardId].name + "：结算并翻面（R26）",
  });
  const result = resolveBattlePressure({ state: { ...state, battle: b }, events });
  if (result.events.some((e) => e.type === "commandRefused"))
    return rejectBattleCommand(state, "饰品压力结算拒绝");
  return finalizeFreeTrinketDuringMonsterTurn(state, result, before, command.allTrinkets);
}
