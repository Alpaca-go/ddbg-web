import { monsterPoolCatalogSchema } from "../../data/src/monster-pool";
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
 * R-197 / QUEST p5：Rising Threat 的 Curio 房必有守卫战，且守卫只抽 1 只 II 级怪。
 * 只处理「任务强制守卫」的 Curio 房；普通 Curio 房守卫仍走完整四姿态部署。
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
  if (
    !mode ||
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
  const catalog = dungeonMonsterPoolThrough(pool, mode.level);
  const ids = pool.remaining ?? catalog.map((entry) => entry.instanceId);
  const levelOf = (cardId: string) =>
    pool.cards.find((card) => card.combatCardId === cardId)?.level;
  const candidates = catalog.filter(
    (entry) => ids.includes(entry.instanceId) && levelOf(entry.cardId) === mode.level,
  );
  if (!candidates.length) return refuse(state, "Curio 房守卫战没有可抽的 II 级怪（R-197）");
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0)
    return refuse(state, "RNG 游标无效（R-197）");
  const rng = createRng(state.seed);
  for (let index = 0; index < d.cursor; index += 1) rng.next();
  const chosen = candidates[Math.floor(rng.next() * candidates.length)]!;
  const spawned = spawnMonsters([chosen], deployment);
  if (spawned.type === "refused") return refuse(state, spawned.reason);
  const blockedReason = `Rising Threat：Curio 房守卫战只抽 1 只 II 级怪（${chosen.cardId}，R-197）；进入前校验英雄装备与全部参战卡，不重抽。`;
  const remaining = ids.filter((id) => id !== chosen.instanceId);
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: d.cursor + 1,
        monsterPool: {
          ...pool,
          remaining,
          discarded: [],
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}
