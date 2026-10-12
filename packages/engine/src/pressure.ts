import type { BattleState } from "./battle";
import type { ApplyResult, GameEvent } from "./command";
import { rejectBattleCommand } from "./battle";
import { createRng, rollD10 } from "./rng";
import { passiveVirtueThreshold } from "./passive";
import { triggerBattlePassive } from "./battle-passive";

export type ResolveCard = {
  readonly id: string;
  readonly role: "virtue" | "affliction";
  readonly verification: { readonly unverified: boolean };
  readonly name?: string;
  readonly verified_turn_start?: {
    readonly rollMin: 1;
    readonly rollMax: number;
    readonly effect:
      | { readonly type: "stress"; readonly scope: "self" | "heroes"; readonly amount: number }
      | { readonly type: "buff"; readonly scope: "self" | "heroes"; readonly duration: number }
      | {
          readonly type: "heal" | "wounds";
          readonly scope: "self";
          readonly amount: number;
          readonly perHeroLevel: true;
        }
      | { readonly type: "consumeProvision"; readonly amount: 1 }
      | { readonly type: "stanceMove"; readonly forwardThrough: 5; readonly distance: 1 };
  };
};

/** R28：首次检定与再次达到 10 压力不同；已有卡（含墓园美德）不再掷骰。 */
export function resolvePressure(
  stress: number,
  tested: boolean,
  cardId: string | null,
  roll?: number,
  virtueThreshold = 2,
):
  | { type: "refused"; reason: string }
  | { type: "unchanged" }
  | { type: "heartAttack" }
  | { type: "needsRoll" }
  | { type: "draw"; role: ResolveCard["role"] } {
  if (!Number.isSafeInteger(stress) || stress < 0 || stress > 10 || typeof tested !== "boolean")
    return { type: "refused", reason: "压力 / 意志检定状态无效" };
  if (cardId !== null && (typeof cardId !== "string" || !cardId))
    return { type: "refused", reason: "意志卡 id 无效" };
  if (tested && !cardId) return { type: "refused", reason: "已检定英雄缺少意志卡（R-048）" };
  if (stress < 10) return { type: "unchanged" };
  if (cardId) return { type: "heartAttack" };
  if (roll === undefined) return { type: "needsRoll" };
  if (!Number.isInteger(roll) || roll < 1 || roll > 10)
    return { type: "refused", reason: "意志骰面无效" };
  if (!Number.isInteger(virtueThreshold) || virtueThreshold < 0 || virtueThreshold > 2)
    return { type: "refused", reason: "美德阈值无效（R27–28）" };
  return { type: "draw", role: roll <= virtueThreshold ? "virtue" : "affliction" };
}

/** 完整五张牌堆；不能剔除未验证卡改变概率。首次需要时洗牌，之后不重复消费 RNG。 */
export function resolveBattlePressure(result: ApplyResult): ApplyResult {
  let battle: BattleState | undefined = result.state.battle;
  if (!battle) return result;
  const events: GameEvent[] = [...result.events];
  for (const original of battle.entities) {
    if (original.side !== "hero" || original.dead || original.stress !== 10) continue;
    const decision = resolvePressure(
      10,
      original.resolveTested ?? false,
      original.resolveCardId ?? null,
    );
    if (decision.type === "refused") return rejectBattleCommand(result.state, decision.reason);
    if (decision.type === "heartAttack") {
      battle = {
        ...battle,
        entities: battle.entities.map((entity) =>
          entity.id === original.id ? { ...entity, dead: true } : entity,
        ),
      };
      events.push({
        type: "heartAttack",
        entityId: original.id,
        message: "已有美德 / 苦难，压力到 10，心脏病死亡（R28）",
      });
      continue;
    }
    const catalog = battle.resolveCards;
    if (
      !catalog ||
      catalog.length !== 10 ||
      new Set(catalog.map((card) => card.id)).size !== 10 ||
      ["virtue", "affliction"].some(
        (role) => catalog.filter((card) => card.role === role).length !== 5,
      ) ||
      catalog.some((card) => card.verification.unverified)
    )
      return rejectBattleCommand(
        result.state,
        "意志检定需要完整获批的五美德 / 五苦难牌堆（R-048）",
      );
    const rng = createRng(result.state.seed);
    for (let index = 0; index < battle.rngCursor; index++) rng.next();
    const roll = rollD10(rng);
    const rollCursor: number = battle.rngCursor + 1;
    battle = { ...battle, rngCursor: rollCursor };
    if (roll === 1 || roll === 10) {
      const passive = triggerBattlePassive(
        battle,
        result.state.seed,
        [original.id],
        roll === 10 ? "rolledTen" : "rolledOne",
      );
      if (passive.status === "refused") return rejectBattleCommand(result.state, passive.reason);
      battle = passive.battle;
      events.push(...passive.events);
      for (let i = rollCursor; i < battle.rngCursor; i++) rng.next();
      if (battle.entities.find((e) => e.id === original.id)!.dead) continue;
    }
    const drawn = resolvePressure(10, false, null, roll, passiveVirtueThreshold(original));
    if (drawn.type !== "draw") return rejectBattleCommand(result.state, "意志检定状态无效");
    let cursor: number = battle.rngCursor;
    const existing: readonly string[] | undefined = battle.resolveDecks?.[drawn.role];
    if (
      existing &&
      (new Set(existing).size !== existing.length ||
        existing.some(
          (id) =>
            !catalog.some((card) => card.id === id && card.role === drawn.role) ||
            battle!.entities.some((entity) => entity.resolveCardId === id),
        ))
    )
      return rejectBattleCommand(result.state, "意志牌堆重复、含未知卡或已分配卡");
    const deck: string[] = existing
      ? [...existing]
      : catalog.filter((card) => card.role === drawn.role).map((card) => card.id);
    if (!existing) {
      for (let index = deck.length - 1; index > 0; index--) {
        const other = Math.floor(rng.next() * (index + 1));
        [deck[index], deck[other]] = [deck[other]!, deck[index]!];
        cursor++;
      }
    }
    const cardId = deck.shift();
    if (!cardId || !catalog.some((card) => card.id === cardId && card.role === drawn.role))
      return rejectBattleCommand(result.state, "意志牌堆耗尽或含未知卡，拒绝补牌");
    battle = {
      ...battle,
      rngCursor: cursor,
      resolveDecks: { ...battle.resolveDecks, [drawn.role]: deck },
      entities: battle.entities.map((entity) =>
        entity.id === original.id
          ? { ...entity, stress: 0, resolveTested: true, resolveCardId: cardId }
          : entity,
      ),
    };
    events.push({
      type: "resolveTested",
      entityId: original.id,
      roll,
      cardId,
      message: "首次意志检定，抽取美德 / 苦难后压力归零（R28）",
    });
  }
  return { ...result, state: { ...result.state, battle }, events };
}

export function pressureCasualties(before: BattleState, result: ApplyResult): string[] {
  return result.state
    .battle!.entities.filter(
      (entity) => entity.dead && !before.entities.find((old) => old.id === entity.id)!.dead,
    )
    .map((entity) => entity.id);
}
