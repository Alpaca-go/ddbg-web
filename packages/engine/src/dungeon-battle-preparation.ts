import { roomCatalogSchema } from "../../data/src/room";
import { approvedRoomTileGeometry } from "../../data/src/normalize/room-tile";
import type { ApplyResult, GameState } from "./command";
import { createRng } from "./rng";

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
    room?.cleared ||
    (room?.kind !== "lair" && room?.kind !== "treasure")
  )
    return refuse("需要未清理的 Lair / Treasure 战斗入口（R15）；Curio 与任务目标另行接线");
  if (!c || !roomCatalogSchema.safeParse(c.cards).success)
    return refuse("需要完整核心盒房间目录，不能只装入已获批板块对应的牌（R10）");
  const pool = c.cards.filter((card) => card.location === "ruins" && !card.boss);
  const available = [
    ...(c.deck ?? pool.map((card) => card.id)),
    ...(c.active ? [c.active.cardId] : []),
    ...(c.discard ?? []),
  ];
  if (
    available.length !== 9 ||
    new Set(available).size !== 9 ||
    available.some((id) => !pool.some((card) => card.id === id)) ||
    (c.active && (c.active.roomId !== d.position || c.deck === null))
  )
    return refuse("遗迹房间牌池不守恒 / 活动房间不一致，保持原状态");
  // 同一战斗入口只抽一次；后续战斗完成接口尚未接入，不允许重抽。
  if (c.active) return refuse("该房间牌已记录；等待板块 / 正式遭遇战接线，不能重抽");
  const deck = [...(c.deck ?? pool.map((card) => card.id))];
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
  const matched =
    card.number === 1 &&
    card.name === approvedRoomTileGeometry.name &&
    approvedRoomTileGeometry.usable;
  const blockedReason = matched
    ? "Ritual Chamber 板块已获批；下一步从完整 Common + Ruins 怪物牌堆抽牌，再校验并进入房间战斗（R10、R15–17）。房间未清理，未发奖励。"
    : `${card.name} 对应板块几何 / 部署尚未获批，保留此牌等待复核（R15、R-048）；不能换成 Ritual Chamber。`;
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
            ...(matched ? { tileId: approvedRoomTileGeometry.id } : {}),
            blockedReason,
          },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message: `已抽 ${card.name}：${blockedReason}` }],
  };
}
