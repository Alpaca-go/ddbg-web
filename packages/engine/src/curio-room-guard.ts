import { monsterPoolCatalogSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import type { ApplyResult, GameState } from "./command";
import type { SkillStance } from "./hero-skill";
import { createRng } from "./rng";
import { readCurioRoomAlwaysGuarded } from "./dungeon-curio-room";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { spawnMonsters } from "./spawn";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});

/**
 * R-197 / QUEST p5：Rising Threat 的 Curio 房必有守卫战；掷出的怪物包含 **1 只 II 级怪**，
 * 其余位仍按本层怪物池补满四姿态（II 级怪不在本层 catalog 时按 outside 实例处理）。
 */
export function prepareCurioRoomGuardMonsters(
  state: GameState,
  deployment: Readonly<Record<SkillStance, string>>,
): ApplyResult {
  const d = state.dungeon!;
  const mode = readCurioRoomAlwaysGuarded(d);
  const pool = d.monsterPool;
  const active = d.roomCards?.active;
  const room = d.rooms.find((r) => r.id === d.position);
  const level = d.explorationSetup?.dungeonLevel;
  if (
    !mode ||
    !level ||
    ![1, 2, 3].includes(level) ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room?.kind !== "curio" ||
    d.curioRoom?.roomId !== d.position ||
    d.curioRoom.stage !== "guarded" ||
    !active ||
    active.roomId !== d.position ||
    !pool ||
    !monsterPoolCatalogSchema.safeParse(pool.cards).success
  )
    return refuse(state, "需要 Rising Threat 的 Curio 房守卫战与完整怪物池（R-197）");
  const catalog = dungeonMonsterPoolThrough(pool, level);
  const ids = pool.remaining ?? catalog.map((entry) => entry.instanceId);
  if (
    ids.length !== catalog.length ||
    new Set(ids).size !== catalog.length ||
    ids.some((id) => !catalog.some((entry) => entry.instanceId === id))
  )
    return refuse(state, "本层怪物牌堆不守恒，不能抽 Curio 房守卫（R-197）");
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0)
    return refuse(state, "RNG 游标无效（R-197）");
  const removed = new Set(pool.permanentlyRemovedCombatCardIds ?? []);
  const guardCandidates = ruinsMonsterPool(pool.cards, mode.level).filter(
    (entry) => !removed.has(entry.cardId),
  );
  if (!guardCandidates.length) return refuse(state, "Curio 房守卫战没有可抽的 II 级怪（R-197）");
  const rng = createRng(state.seed);
  for (let index = 0; index < d.cursor; index += 1) rng.next();
  const guard = guardCandidates[Math.floor(rng.next() * guardCandidates.length)]!;
  let cursor = d.cursor + 1;
  const deck = ids.map((id) => catalog.find((entry) => entry.instanceId === id)!);
  if (pool.remaining === null) {
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const target = Math.floor(rng.next() * (index + 1));
      [deck[index], deck[target]] = [deck[target]!, deck[index]!];
      cursor += 1;
    }
  }
  const spawned = spawnMonsters([guard, ...deck], deployment);
  if (spawned.type === "refused") return refuse(state, spawned.reason);
  if (spawned.monsters.reduce((sum, monster) => sum + monster.stanceSlots, 0) !== 4)
    return refuse(state, "Curio 房守卫战未填满四姿态，不提交半场部署（R-197）");
  const blockedReason = `Rising Threat：Curio 房守卫战包含 1 只 II 级怪（${guard.cardId}，R-197）；其余位按本层池补满四姿态，不重抽。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        curioRoom: { ...d.curioRoom!, guardInstanceId: guard.instanceId },
        monsterPool: {
          ...pool,
          remaining: spawned.remaining.map((entry) => entry.instanceId),
          discarded: spawned.discarded.map((entry) => entry.instanceId),
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}
