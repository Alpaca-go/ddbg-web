import { rejectBattleCommand } from "./battle";
import type { BattleState } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { drawTrinket, chooseTrinket, trinketOptions } from "./trinket-acquisition";
import { finishTurn } from "./encounter";
import { triggerBattlePassive } from "./battle-passive";
import { pressureCasualties, resolveBattlePressure } from "./pressure";
import { endAfterCasualties, removeCasualties } from "./encounter";
import { clearEldritchVaultReward, drawNextEldritchVaultTrinket } from "./battle-eldritch-vault";

const heroes = (battle: BattleState) =>
  battle.entities
    .filter((entity) => entity.side === "hero")
    .map((hero) => ({
      id: hero.id,
      dead: hero.dead,
      ...(hero.heroLevel === undefined ? {} : { level: hero.heroLevel }),
    }));

export function openBattleTrinketChoice(
  state: GameState,
  actorId: string,
  prompt: string,
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!,
    pool = battle.trinkets!;
  const options = trinketOptions(pool, heroes(battle)).map(({ id, label }) => ({ id, label }));
  if (!options.length)
    return rejectBattleCommand(state, "饰品获得缺少完整牌池或合法接收选项（R-048）");
  const card = pool.cards.find((card) => card.id === pool.incoming!.cardId)!;
  const choice = {
    id: `battle-trinket:${battle.choiceCursor}`,
    actorId,
    prompt: `${prompt} · ${card.name}；${card.verification.unverified ? "卡面未复核，可明确弃新卡或保留停点等待复核" : "选择携带者、转交或弃牌"}`,
    options,
  };
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        choiceCursor: battle.choiceCursor + 1,
        pending: { type: "trinketReward", actorId, choice },
      },
    },
    events,
    pendingChoice: choice,
  };
}

function pendingTrinket(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
  prompt = "Loot the Chest",
): ApplyResult {
  return openBattleTrinketChoice(state, actorId, prompt, events);
}

function continueVaultDraws(state: GameState, actorId: string, events: GameEvent[]): ApplyResult {
  const b = state.battle!;
  if ((b.eldritchVaultDrawsRemaining ?? 0) > 0) {
    const next = drawNextEldritchVaultTrinket(state, actorId);
    return { ...next, events: [...events, ...next.events] };
  }
  const stress = b.eldritchVaultStress ?? 0;
  let cleared = clearEldritchVaultReward(state);
  let merged = events;
  if (stress > 0) {
    // Q-141：使用 Vault 的承受压力 = 在场英雄数；装备再 +2 由饰品选项处理。
    const passive = triggerBattlePassive(cleared.battle!, cleared.seed, [actorId], {
      type: "stress",
      amount: stress,
    });
    if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
    const pressure = resolveBattlePressure({
      state: { ...cleared, battle: passive.battle },
      events: [
        ...events,
        ...passive.events,
        {
          type: "areaStressResolved",
          actorId,
          message: `Eldritch Vault：使用房间承受压力 +${stress}（Q-141）`,
        },
      ],
    });
    if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
    if (pressure.state.battle?.pending) return pressure;
    cleared = pressure.state;
    merged = [...pressure.events];
  }
  const turn = cleared.battle?.encounter?.turn;
  return turn?.type === "hero" && turn.actions === 0
    ? finishTurn(cleared, turn.actorId, merged)
    : { state: cleared, events: merged };
}

/** Stygian 宝箱与秘库先支付两行动及压力。调用方只给存活使用者开启抽牌。 */
export function payRoomTrinketCost(
  state: GameState,
  actorId: string,
  amount: number,
  room: string,
): ApplyResult {
  const b = state.battle!;
  const turn = b.encounter!.turn;
  if (turn.type !== "hero") return rejectBattleCommand(state, "房间饰品需要当前英雄回合");
  const passive = triggerBattlePassive(b, state.seed, [actorId], { type: "stress", amount });
  if (passive.status === "refused") return rejectBattleCommand(state, passive.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: {
        ...passive.battle,
        encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions - 2 } },
      },
    },
    events: [
      ...passive.events,
      {
        type: "roomInteractionResolved",
        actorId,
        message: `${room}：支付2行动和压力 +${amount}（R-036）`,
      },
    ],
  });
  const refused = pressure.events.find((event) => event.type === "commandRefused");
  if (refused) return rejectBattleCommand(state, refused.message);
  return removeCasualties(pressure, pressureCasualties(b, pressure));
}

/** R26、R-065：T5的两个行动在成功抽牌时只扣一次，每场只允许一次。 */
export function lootTreasureChest(state: GameState, actorId: string): ApplyResult {
  const original = state.battle,
    turn = original?.encounter?.turn,
    actor = original?.entities.find((entity) => entity.id === actorId),
    area = original?.areas.find((a) => a.id === actor?.areaId);
  if (
    !original ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 2 ||
    turn.mustMove ||
    !actor ||
    actor.dead ||
    actor.side !== "hero" ||
    !area?.lootTheChest ||
    original.lootChestUsed ||
    original.pending ||
    original.shuffleIntents.length ||
    original.shuffleContinuation
  )
    return rejectBattleCommand(
      state,
      "Loot the Chest需要当前英雄在T5、两个可用行动且本场尚未使用（R-065）",
    );
  if (
    !original.trinkets ||
    (state.dungeon && original.trinkets.level !== state.dungeon.explorationSetup?.dungeonLevel)
  )
    return rejectBattleCommand(state, "缺少本地牢等级的完整饰品牌池（R26/R35、R-048）");
  const cost = area.lootTheChestStress;
  const paid = cost
    ? payRoomTrinketCost(state, actorId, cost, "Loot the Chest")
    : { state, events: [] };
  if (paid.events.some((event) => event.type === "commandRefused")) return paid;
  const b = paid.state.battle!;
  if (b.entities.find((e) => e.id === actorId)!.dead) {
    const spent = {
      ...paid,
      state: { ...paid.state, battle: { ...b, lootChestUsed: true as const } },
    };
    return endAfterCasualties(spent) ?? finishTurn(spent.state, actorId, spent.events);
  }
  const drawn = drawTrinket(b.trinkets!, heroes(b), actorId, state.seed, b.rngCursor);
  if (drawn.status === "refused") return rejectBattleCommand(state, drawn.reason);
  return pendingTrinket(
    {
      ...paid.state,
      battle: {
        ...b,
        trinkets: drawn.pool,
        rngCursor: drawn.cursor,
        lootChestUsed: true,
        encounter: cost
          ? b.encounter!
          : { ...b.encounter!, turn: { ...turn, actions: turn.actions - 2 } },
      },
    },
    actorId,
    [
      ...paid.events,
      {
        type: "roomInteractionResolved",
        actorId,
        message: cost
          ? "Loot the Chest：从完整饰品牌堆抽1张，本场已使用（R-036）"
          : "Loot the Chest：花2行动，从完整饰品牌堆抽1张；本场已使用（R-065）",
      },
    ],
  );
}

export function resolveBattleTrinketChoice(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!,
    pending = b.pending,
    turn = b.encounter?.turn;
  const vault = b.eldritchVaultReward === true;
  const delegatedVault =
    vault &&
    b.areas.some((area) => area.eldritchVaultPayBeforeDraw) &&
    b.entities.some((e) => turn?.type === "hero" && e.id === turn.actorId && e.dead);
  if (
    pending?.type !== "trinketReward" ||
    turn?.type !== "hero" ||
    (turn.actorId !== pending.actorId && !delegatedVault) ||
    !b.trinkets ||
    (!b.lootChestUsed && !vault) ||
    b.trinkets.incoming?.actorId !== pending.actorId
  )
    return rejectBattleCommand(state, "饰品获得上下文无效");
  const option = trinketOptions(b.trinkets, heroes(b)).find((o) => o.id === optionId);
  const chosen = chooseTrinket(b.trinkets, heroes(b), optionId);
  if (chosen.status === "refused") return rejectBattleCommand(state, chosen.reason);
  let next: GameState = { ...state, battle: { ...b, trinkets: chosen.pool, pending: null } };
  const events: GameEvent[] = [
    {
      type: "roomInteractionResolved",
      actorId: pending.actorId,
      message: chosen.pool.incoming
        ? "饰品转交／腾位完成，继续处理原入牌；不重抽、不重复扣行动"
        : vault
          ? "Eldritch Vault 饰品处置完成；装备正置，不自动使用能力或翻面（R26）"
          : "饰品获得选择完成；新装备正置，不自动使用能力或翻面（R26）",
    },
  ];
  if (chosen.pool.incoming) return pendingTrinket(next, pending.actorId, events);
  if (vault && option?.action.type === "equip") {
    const equipHero = option.action.heroId;
    const paid = triggerBattlePassive({ ...next.battle! }, state.seed, [equipHero], {
      type: "stress",
      amount: 2,
    });
    if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
    const pressure = resolveBattlePressure({
      state: {
        ...next,
        battle: {
          ...paid.battle,
          trinkets: paid.battle.trinkets ?? b.trinkets!,
        },
      },
      events: [
        ...events,
        ...paid.events,
        {
          type: "roomInteractionResolved",
          actorId: pending.actorId,
          message: `Eldritch Vault：${equipHero} 装备饰品，压力 +2（R-156）`,
        },
      ],
    });
    const refused = pressure.events.find((e) => e.type === "commandRefused");
    if (refused) return rejectBattleCommand(state, refused.message);
    const result = removeCasualties(pressure, pressureCasualties(b, pressure));
    const ended = endAfterCasualties(result);
    if (ended) return ended;
    next = result.state;
    events.length = 0;
    events.push(...result.events);
  }
  if (vault) return continueVaultDraws(next, pending.actorId, events);
  return turn.actions === 0 ? finishTurn(next, pending.actorId, events) : { state: next, events };
}
