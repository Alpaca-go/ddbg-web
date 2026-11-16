import type { ApplyResult, GameState } from "../../command";
import type { DungeonState } from "../../dungeon";
import type { SkillStance } from "../../hero-skill";
import { spawnMonsters, type SpawnCard } from "../../spawn";
import { createRng } from "../../rng";
import { dungeonMonsterPoolThrough } from "../../monster-pool-runtime";
import { dungeonMonsterPoolCatalogValid } from "../../monster-pool-validation";

export function forcedWealdTaskCards(d: DungeonState): SpawnCard[] {
  if (
    d.wealdHigherQuestOffers !== "tasks-v1" ||
    d.rooms.find((r) => r.id === d.position)?.kind !== "objective"
  )
    return [];
  const id = d.questDistribution?.questId;
  const pages =
    id === "quest:weald:p006"
      ? [18]
      : id === "quest:weald:p012"
        ? [17]
        : id === "quest:weald:p009"
          ? [6, 7, 8]
          : [];
  return pages.map((p) => ({
    instanceId: `monster-deck:weald:p${String(p).padStart(3, "0")}`,
    cardId:
      p === 18
        ? "monster_medium:weald:p018"
        : p === 17
          ? "monster_large:weald:p003"
          : "monster_medium:weald:p006",
    edge: p === 18 ? "back" : "front",
    stanceSlots: p === 17 ? 2 : 1,
    verified: true,
  }));
}
export function forcedWealdTaskOutsideIds(d: DungeonState): string[] {
  const cards = forcedWealdTaskCards(d),
    active = d.monsterPool?.active;
  return cards
    .filter(
      (c) =>
        active?.roomId === d.position &&
        active.monsters.some(
          (m) =>
            m.instanceId === c.instanceId &&
            m.cardId === c.cardId &&
            m.stanceSlots === c.stanceSlots,
        ),
    )
    .map((c) => c.instanceId);
}
export function prepareForcedWealdTaskMonsters(
  state: GameState,
  deployment: Readonly<Record<SkillStance, string>>,
): ApplyResult | undefined {
  const d = state.dungeon!,
    forced = forcedWealdTaskCards(d);
  if (!forced.length) return undefined;
  const pool = d.monsterPool!;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (
    !dungeonMonsterPoolCatalogValid(d) ||
    pool.active ||
    pool.discarded.length ||
    !Number.isSafeInteger(d.cursor)
  )
    return refuse("任务指定怪物来源或牌池状态不符（R-265）");
  const catalog = dungeonMonsterPoolThrough(pool, d.explorationSetup!.dungeonLevel);
  const ids = pool.remaining ?? catalog.map((c) => c.instanceId);
  if (
    ids.length !== catalog.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !catalog.some((c) => c.instanceId === id))
  )
    return refuse("任务指定怪物组件／普通牌池不守恒（R-265）");
  const only = d.questDistribution!.questId === "quest:weald:p009";
  const deck = ids.map((id) => catalog.find((c) => c.instanceId === id)!);
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  if (!only && pool.remaining === null)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
  let extraDraws = 0;
  let spawned = spawnMonsters(only ? forced : [...forced, ...deck], deployment);
  if (spawned.type === "refused") return refuse(spawned.reason);
  // R-029 的后续大型怪可能挤掉首放的小型指定怪；此时按 R-265 满栏随机替换，
  // 再从剩余真实牌序补空位，不筛牌、重洗或改成重抽种子。
  const discarded = [...spawned.discarded];
  for (const card of forced) {
    while (!spawned.monsters.some((m) => m.instanceId === card.instanceId)) {
      const index = Math.floor(rng.next() * spawned.monsters.length);
      extraDraws++;
      const removed = spawned.monsters[index];
      if (!removed) return refuse("指定怪满栏替换没有合法组件（R-265）");
      discarded.push(removed);
      const retried = spawnMonsters([card, ...spawned.remaining], deployment, {
        initial: spawned.monsters.filter((_, i) => i !== index),
      });
      if (retried.type === "refused") return refuse(retried.reason);
      discarded.push(...retried.discarded);
      spawned = retried;
    }
  }
  const discardedCards = discarded.filter(
    (c) => !forced.some((f) => f.instanceId === c.instanceId),
  );
  const blockedReason = "任务指定真实组件已部署；按本任务池补满／三只独立遭遇，战后复用（R-265）";
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: d.cursor + (!only && pool.remaining === null ? deck.length - 1 : 0) + extraDraws,
        monsterPool: {
          ...pool,
          remaining: only ? [...ids] : spawned.remaining.map((c) => c.instanceId),
          discarded: discardedCards.map((c) => c.instanceId),
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, blockedReason } },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}

export function elderGiantActive(state: GameState, actorId?: string): boolean {
  const d = state.dungeon;
  return (
    d?.wealdHigherQuestOffers === "tasks-v1" &&
    d.questDistribution?.questId === "quest:weald:p012" &&
    forcedWealdTaskOutsideIds(d).includes("monster-deck:weald:p017") &&
    (!actorId || actorId === "monster-deck:weald:p017")
  );
}
