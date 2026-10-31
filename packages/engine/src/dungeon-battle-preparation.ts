import { prepareDarkestRoom } from "./darkest-setup";
import { roomCatalogSchema } from "../../data/src/room";
import { readRoomTile } from "./room-tile-selection";
import type { ApplyResult, GameState } from "./command";
import { createRng } from "./rng";
import { isGuardedDungeonRoom } from "./dungeon-curio-room";
import {
  allRuinsRoomCardIds,
  prepareObjectiveRoomBattle,
  ruinsRoomDeckWithoutSetAside,
  readSetAsideRoomCardId,
} from "./dungeon-objective";

/** R10、R15：遗迹普通房间完整洗牌，取顶牌再匹配板块；不替换未获批房间。 */
export function prepareDungeonBattle(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const c = d.roomCards;
  const room = d.rooms.find((r) => r.id === d.position);
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (
    d.phase !== "awaitingRoom" ||
    d.pending ||
    d.mustLeaveRoomId === d.position ||
    !room ||
    room?.cleared ||
    !isGuardedDungeonRoom(d)
  )
    return refuse("需要未清理的 Lair / Treasure / Objective / 有守卫 Curio 战斗入口（R15）");
  if (d.darkest) return prepareDarkestRoom(state);
  const objective = prepareObjectiveRoomBattle(state);
  if (objective) return objective;
  if (!c || !roomCatalogSchema.safeParse(c.cards).success)
    return refuse("需要完整核心盒房间目录，不能只装入已获批板块对应的牌（R10）");
  const pool = c.cards.filter((card) => card.location === "ruins" && !card.boss);
  const defaultDeck = ruinsRoomDeckWithoutSetAside(c.cards, readSetAsideRoomCardId(d));
  const available = allRuinsRoomCardIds(d);
  if (
    available.length !== 9 ||
    new Set(available).size !== 9 ||
    available.some((id) => !pool.some((card) => card.id === id)) ||
    (c.active && c.active.roomId !== d.position)
  )
    return refuse("遗迹房间牌池不守恒 / 活动房间不一致，保持原状态");
  // 同一入口不重抽；本场完成交接后弃置已抽房间牌。
  if (c.active) return refuse("该房间牌已记录；等待板块 / 正式遭遇战接线，不能重抽");
  const deck = [...(c.deck ?? defaultDeck)];
  if (!deck.length) return refuse("本地牢房间牌已用尽；不洗回弃牌（R25）");
  let cursor = d.cursor;
  if (c.deck === null) {
    const rng = createRng(state.seed);
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
  }
  const cardId = deck.shift()!;
  const card = pool.find((card) => card.id === cardId)!;
  const selected = readRoomTile(card);
  const blockedReason =
    selected.status === "matched"
      ? `${selected.tile.name} 板块已获批；下一步从完整 Common + Ruins 怪物牌堆抽牌，再校验并进入房间战斗（R10、R15–17）。房间未清理，未发奖励。`
      : `${selected.reason.startsWith(card.name) ? selected.reason : `${card.name} ${selected.reason}`}；保留此牌，不能替换房间。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        roomCards: {
          ...c,
          deck,
          active: {
            roomId: room.id,
            cardId,
            ...(selected.status === "matched" ? { tileId: selected.tile.id } : {}),
            blockedReason,
          },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message: `已抽 ${card.name}：${blockedReason}` }],
  };
}
