import { readDarkestBossEncounter } from "./boss/darkest-content";
import { prepareDarkestObjectiveBossRoom } from "./boss/darkest-mid-boss-runtime";
import poolFile from "../../data/normalized/corebox/darkest_monster_pool.json";
import trinketFile from "../../data/normalized/corebox/trinket.json";
import {
  darkestMonsterPoolFileSchema,
  darkestDungeonMonsterInstances,
} from "../../data/src/darkest-monster-pool";
import { coreQuestMapLayouts } from "../../data/src/quest-map-pairing";
import type { DungeonLayout, RoomTokenKind } from "../../data/src/dungeon-layout";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { R121_BOSS_SLOT_LAYOUTS } from "./boss/default-boss-hooks";
import { switchTrinketDungeonLevel } from "./trinket-acquisition";
import { createRng } from "./rng";
import type { GameState, ApplyResult } from "./command";

export function isDarkestQuest(
  id: string | undefined,
): id is "quest:p016" | "quest:p017" | "quest:p018" {
  return ["quest:p016", "quest:p017", "quest:p018"].includes(id ?? "");
}

/** R36 / R-121：两图随机取一；Objective+两枚随机非目标先洗入三个 Boss 位。 */
export function placeDarkestRooms(seed: number, kinds: readonly RoomTokenKind[]) {
  const rng = createRng(seed);
  let cursor = 0;
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      cursor++;
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  const maps = coreQuestMapLayouts()
    .filter((l) => l.id in R121_BOSS_SLOT_LAYOUTS)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (
    maps.length !== 2 ||
    kinds.length !== 16 ||
    kinds.filter((k) => k === "objective").length !== 1
  )
    throw new Error("最暗布置需要两张获批地图与16枚含唯一目标的代币（R36）");
  const layout: DungeonLayout = shuffle(maps)[0]!;
  const bossIds = R121_BOSS_SLOT_LAYOUTS[layout.id as keyof typeof R121_BOSS_SLOT_LAYOUTS];
  if (
    layout.review !== "confirmed" ||
    layout.unresolvedMarkers?.length ||
    layout.nodes.some((n) => n.kind === "unresolved") ||
    layout.nodes.filter((n) => n.kind === "room").length !== 16 ||
    layout.nodes.filter((n) => n.slotKind === "boss").length !== 3 ||
    bossIds.some((id) => !layout.nodes.some((n) => n.id === id && n.slotKind === "boss"))
  )
    throw new Error("最暗 Boss 位布局未获批（R-121）");
  const other = shuffle(kinds.filter((k) => k !== "objective"));
  const special = shuffle(["objective" as RoomTokenKind, ...other.slice(0, 2)]);
  const rest = shuffle(other.slice(2));
  let specialIndex = 0,
    restIndex = 0;
  const rooms = layout.nodes
    .filter((n) => n.kind === "room")
    .map((n) => ({
      id: n.id,
      kind: (bossIds as readonly string[]).includes(n.id)
        ? special[specialIndex++]!
        : rest[restIndex++]!,
      revealed: false,
    }));
  return {
    layout,
    rooms,
    shuffle,
    get cursor() {
      return cursor;
    },
  };
}

/** 新最暗任务入口；旧地点牌组退出使用，Curio/条件牌组继续沿用。 */
export function setupDarkestDungeon(game: GameState): GameState {
  const d = game.dungeon!;
  if (
    !isDarkestQuest(d.questDistribution?.questId) ||
    !d.roomCards ||
    !d.trinkets ||
    !d.explorationSetup
  )
    throw new Error("缺少最暗任务及完整牌池");
  const placed = placeDarkestRooms(
    game.seed,
    d.questDistribution!.counts.flatMap((c) => Array.from({ length: c.count }, () => c.kind)),
  );
  const monsterPool = darkestMonsterPoolFileSchema.parse(poolFile);
  const instances = placed.shuffle(darkestDungeonMonsterInstances(monsterPool));
  const roomDeck = placed.shuffle(
    d.roomCards.cards.filter((c) => c.location === "darkestDungeon" && !c.boss).map((c) => c.id),
  );
  if (roomDeck.length !== 8) throw new Error("最暗房间牌池须为完整八张普通房间（R36）");
  let trinkets = d.trinkets;
  while (trinkets.level < 3) {
    const switched = switchTrinketDungeonLevel(
      trinkets,
      normalizedTrinketFileSchema.parse(trinketFile).cards,
      (trinkets.level + 1) as 2 | 3,
    );
    if ("reason" in switched) throw new Error(switched.reason);
    trinkets = switched;
  }
  const { monsterPool: _old, ...base } = d;
  void _old;
  return {
    ...game,
    dungeon: {
      ...base,
      layout: placed.layout,
      rooms: placed.rooms,
      cursor: placed.cursor,
      campaignLevel: 3,
      explorationSetup: { ...d.explorationSetup, dungeonLevel: 3 },
      trinkets,
      roomCards: { ...d.roomCards, deck: roomDeck, discard: [], active: null },
      darkest: { monsterPool, monsterDeck: instances.map((m) => m.instanceId) },
    },
  };
}

/** 最暗战斗几何尚未获批时保留真实抽牌，不回退遗迹牌堆。 */
export function prepareDarkestRoom(state: GameState): ApplyResult {
  const d = state.dungeon!,
    cards = d.roomCards!;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (cards.active) return refuse("最暗房间已记录，不能重抽");
  const objectiveRoom = prepareDarkestObjectiveBossRoom(state);
  if (objectiveRoom) return objectiveRoom;
  const objective = d.rooms.find((r) => r.id === d.position)?.kind === "objective";
  const cardId = objective
    ? readDarkestBossEncounter(d.questDistribution?.questId)?.roomCardId
    : cards.deck?.[0];
  const card = cards.cards.find(
    (c) => c.id === cardId && c.location === "darkestDungeon" && c.boss === objective,
  );
  if (!card) return refuse("最暗房间堆已空或专属房间身份缺失（R36）");
  const blockedReason = `${card.name}：最暗房间几何与战斗部署待审核；已记录原牌，不改抽遗迹房间（R-048）`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        roomCards: {
          ...cards,
          deck: objective ? cards.deck : cards.deck!.slice(1),
          active: { roomId: d.position, cardId: card.id, blockedReason },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}
