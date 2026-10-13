import { monsterPoolCatalogSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import { roomCatalogSchema } from "../../data/src/room";
import { readRoomTile } from "./room-tile-selection";
import type { ApplyResult, GameState } from "./command";
import { createRng } from "./rng";
import { spawnMonsters } from "./spawn";

/** R10、R16–17：完整 I 级 Common + Ruins 一次洗牌，真实抽牌后记录部署，不筛掉缺战斗字段的卡。 */
export function prepareDungeonMonsters(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const pool = d.monsterPool;
  const active = d.roomCards?.active;
  const selected = readRoomTile(
    d.roomCards?.cards.find((c) => c.id === active?.cardId),
    active?.tileId,
  );
  const room = d.rooms.find((r) => r.id === d.position);
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room?.cleared ||
    (room?.kind !== "lair" && room?.kind !== "treasure") ||
    active?.roomId !== d.position ||
    !active?.tileId ||
    selected.status !== "matched" ||
    !roomCatalogSchema.safeParse(d.roomCards?.cards).success
  )
    return refuse("需要已抽房间与可用板块的获批部署；不能替换房间或提前抽怪物（R-048）");
  const { deployment } = selected;
  const roomIds = [...(d.roomCards!.deck ?? []), ...(d.roomCards!.discard ?? []), active.cardId];
  if (
    roomIds.length !== 9 ||
    new Set(roomIds).size !== 9 ||
    roomIds.some(
      (id) => !d.roomCards!.cards.some((c) => c.id === id && c.location === "ruins" && !c.boss),
    )
  )
    return refuse("房间牌堆不守恒，不能推进怪物部署");
  if (
    d.explorationSetup?.dungeonLevel !== 1 ||
    !pool ||
    !monsterPoolCatalogSchema.safeParse(pool.cards).success
  )
    return refuse("本入口需要完整 Common + Ruins 目录与 I 级地牢，不能使用三种沙盒怪物");
  if (pool.active || pool.discarded.length)
    return refuse("本场怪物已记录或牌堆状态不一致；不能重抽 / 重洗 / 发奖励");
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0) return refuse("RNG 游标无效");
  const catalog = ruinsMonsterPool(pool.cards, 1);
  const ids = pool.remaining ?? catalog.map((card) => card.instanceId);
  if (
    ids.length !== 42 ||
    new Set(ids).size !== 42 ||
    ids.some((id) => !catalog.some((c) => c.instanceId === id))
  )
    return refuse("怪物牌堆不守恒，不能重新抽牌");
  const deck = ids.map((id) => catalog.find((card) => card.instanceId === id)!);
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  for (let i = pool.remaining === null ? deck.length - 1 : 0; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  const spawned = spawnMonsters(deck, deployment.monsters);
  if (spawned.type === "refused") return refuse(spawned.reason);
  if (spawned.monsters.reduce((n, m) => n + m.stanceSlots, 0) !== 4)
    return refuse("牌堆未填满四姿态，不提交半场部署");
  const missing = spawned.monsters.flatMap((m) => {
    const card = pool.cards.find((c) => c.combatCardId === m.cardId)!;
    const labels = { speed: "移动值", stanceGroups: "姿态选招", unverifiedIcons: "未确认图标" };
    return card.missingBattleFields.length
      ? [`${card.name}：${card.missingBattleFields.map((field) => labels[field]).join(" / ")}`]
      : [];
  });
  const blockedReason = `${missing.length ? `待核实战斗字段：${missing.join("；")}。` : "本场怪物基础字段齐全；入场还需校验完整技能效果。"}部署顺序已记录；进入前校验英雄装备与全部参战卡，不重抽，房间未清理，未发奖励。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: d.cursor + (pool.remaining === null ? deck.length - 1 : 0),
        monsterPool: {
          ...pool,
          remaining: spawned.remaining.map((m) => m.instanceId),
          discarded: spawned.discarded.map((m) => m.instanceId),
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `完整 42 张怪物池已抽 ${spawned.drawn} 张：${blockedReason}`,
      },
    ],
  };
}
