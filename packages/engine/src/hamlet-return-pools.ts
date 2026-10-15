import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";
import { createLootState } from "./loot";
import { curioCatalogSchema } from "../../data/src/curio";
import { roomCatalogSchema } from "../../data/src/room";

/** R32 a：只把弃牌洗回对应堆；保留持牌，不缩减目录或偷偷补缺牌。 */
export function recoverHamletPools(d: DungeonState, seed: number) {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const conditions = d.conditions,
    trinkets = d.trinkets,
    curio = d.curio,
    rooms = d.roomCards,
    // 未发生战斗时宝箱池尚未实例化；沿既有createLootState的十枚规范实例建立。
    loot = d.lootPool ?? { ...createLootState(), gold: d.gold };
  if (
    !conditions ||
    !trinkets ||
    !curio ||
    !rooms ||
    conditions.incomingQuirk ||
    trinkets.incoming ||
    curio.active ||
    rooms.active ||
    !curioCatalogSchema.safeParse(curio.cards).success ||
    !roomCatalogSchema.safeParse(rooms.cards).success
  )
    return refuse("回村需要完整牌池且所有获得/房间效果已完成（R32、R-048）");
  const problem =
    conditionPoolProblem(conditions, d.heroes) ?? trinketPoolProblem(trinkets, d.heroes);
  if (problem) return refuse(problem);
  const roomIds = rooms.cards.filter((c) => c.location === "ruins" && !c.boss).map((c) => c.id);
  const conserved = (all: readonly string[], parts: readonly string[]) =>
    parts.length === all.length &&
    new Set(parts).size === all.length &&
    parts.every((id) => all.includes(id));
  if (
    !conserved(
      curio.cards.map((c) => c.id),
      [...(curio.deck ?? curio.cards.map((c) => c.id)), ...curio.discard],
    ) ||
    !conserved(roomIds, [...(rooms.deck ?? roomIds), ...(rooms.discard ?? [])])
  )
    return refuse("Curio或遗迹房间牌池不守恒，未回收（R32）");
  const tokens = createLootState().available;
  if (
    loot.placed.length ||
    !conserved(
      tokens.map((t) => t.id),
      [...loot.available.map((t) => t.id), ...loot.claimedIds],
    ) ||
    loot.available.some(
      (t) => !tokens.some((expected) => expected.id === t.id && expected.kind === t.kind),
    ) ||
    loot.gold !== d.gold
  )
    return refuse("战利品实例或金币不守恒，未回收（R-047、R32）");
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0 || !Number.isSafeInteger(d.cursor + 200))
    return refuse("回村RNG游标无效");
  const rng = createRng(seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  let cursor = d.cursor;
  const shuffle = <T>(values: readonly T[]): T[] => {
    const deck = [...values];
    for (let i = deck.length - 1; i > 0; i--) {
      const other = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[other]] = [deck[other]!, deck[i]!];
      cursor++;
    }
    return deck;
  };
  const recycle = (
    deck: readonly string[] | null | undefined,
    discard: readonly string[],
    available: readonly string[],
  ) =>
    discard.length
      ? shuffle([...(deck ?? available.filter((id) => !discard.includes(id))), ...discard])
      : deck;
  const held = d.heroes.flatMap((h) => h.quirkIds ?? []);
  const quirkIds = (polarity: "positive" | "negative") =>
    conditions.quirks
      .filter((c) => c.polarity === polarity && !held.includes(c.id))
      .map((c) => c.id);
  const discardQuirks = (polarity: "positive" | "negative") =>
    conditions.quirkDiscard.filter((id) =>
      conditions.quirks.some((c) => c.id === id && c.polarity === polarity),
    );
  // 固定软件采样顺序沿R32列表：饰品、Curio、怪癖、疾病、房间、宝箱。
  const trinketDeck = recycle(
    trinkets.deck,
    trinkets.discard,
    trinkets.cards
      .filter((c) => c.level === trinkets.level && !trinkets.held.some((h) => h.cardId === c.id))
      .map((c) => c.id),
  );
  const inactiveTrinkets = trinkets.inactive?.map((p) => ({
    ...p,
    deck:
      recycle(
        p.deck,
        p.discard,
        trinkets.cards
          .filter((c) => c.level === p.level && !trinkets.held.some((h) => h.cardId === c.id))
          .map((c) => c.id),
      ) ?? null,
    discard: [],
  }));
  const curioDeck = recycle(
    curio.deck,
    curio.discard,
    curio.cards.map((c) => c.id),
  );
  const negativeDeck = recycle(
    conditions.negativeDeck,
    discardQuirks("negative"),
    quirkIds("negative"),
  );
  const positiveDeck = recycle(
    conditions.positiveDeck ?? null,
    discardQuirks("positive"),
    quirkIds("positive"),
  );
  const diseaseDeck = recycle(
    conditions.diseaseDeck,
    conditions.diseaseDiscard,
    conditions.diseases.filter((c) => !d.heroes.some((h) => h.diseaseId === c.id)).map((c) => c.id),
  );
  const roomDeck = recycle(rooms.deck, rooms.discard ?? [], roomIds);
  const availableLoot = loot.claimedIds.length
    ? shuffle([...loot.available, ...loot.claimedIds.map((id) => tokens.find((t) => t.id === id)!)])
    : loot.available;
  return {
    status: "resolved" as const,
    dungeon: {
      ...d,
      cursor,
      trinkets: {
        ...trinkets,
        deck: trinketDeck ?? null,
        discard: [],
        ...(inactiveTrinkets ? { inactive: inactiveTrinkets } : {}),
      },
      curio: { ...curio, deck: curioDeck ?? null, discard: [] },
      conditions: {
        ...conditions,
        negativeDeck: negativeDeck ?? null,
        positiveDeck: positiveDeck ?? null,
        diseaseDeck: diseaseDeck ?? null,
        quirkDiscard: [],
        diseaseDiscard: [],
      },
      roomCards: { ...rooms, deck: roomDeck ?? null, discard: [] },
      lootPool: { ...loot, available: availableLoot, claimedIds: [] },
    },
  };
}
