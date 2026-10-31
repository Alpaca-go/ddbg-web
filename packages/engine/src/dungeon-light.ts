import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { triggerDungeonPassive } from "./dungeon-passive";
import { dungeonProvisionWindow } from "./dungeon-provision-window";
import { resolveCurioRows } from "./dungeon-curio-effects";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { completeDungeonDarkRoom } from "./dungeon-room";
import type { UseProvisionCommand } from "./provision-use";
import { readBasicQuest } from "../../data/src/basic-quests";
import type { DungeonState } from "./dungeon";

/** QUEST p11 / R-045：光照已满也可点亮尚未清理的任务暗房。 */
export function warmUpDarkRoomNeedsTorch(d: DungeonState): boolean {
  const room = d.rooms.find((r) => r.id === d.position);
  return (
    d.phase === "ready" &&
    room?.kind === "dark" &&
    !!room.revealed &&
    !room.cleared &&
    readBasicQuest(d.questDistribution)?.id === "quest:p011"
  );
}

/** R12、R15、R27：仅实际改变光照时触发全队被动，不以净压力差推断原因。 */
export function changeDungeonLight(state: GameState, light: number): ApplyResult {
  const d = state.dungeon!;
  const setup = d.explorationSetup;
  if (
    !setup ||
    !Number.isInteger(setup.light) ||
    setup.light < 0 ||
    setup.light > 5 ||
    !Number.isInteger(light) ||
    light < 0 ||
    light > 5 ||
    !d.heroes.length ||
    new Set(d.heroes.map((h) => h.id)).size !== d.heroes.length ||
    d.heroes.some((h) => h.dead || !Number.isInteger(h.stress) || h.stress < 0 || h.stress > 9)
  )
    return rejectBattleCommand(state, "光照 / 英雄压力无效，或仍需英雄替换（R-048）");
  const changed = { ...d, explorationSetup: { ...setup, light } };
  const applied =
    light === setup.light
      ? null
      : triggerDungeonPassive(
          changed,
          state.seed,
          d.heroes.map((h) => h.id),
          light > setup.light ? "lightRaised" : "lightLowered",
        );
  if (applied?.status === "refused") return rejectBattleCommand(state, applied.reason);
  return {
    state: { ...state, dungeon: applied?.dungeon ?? changed },
    events: [
      { type: "dungeonUpdated", message: `光照 ${setup.light} → ${light}` },
      ...(applied?.events ?? []),
    ],
  };
}

/** 光照已支付；压力恢复不重复改变光照或消耗补给。 */
export function settleDungeonLight(result: ApplyResult): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  const d = result.state.dungeon!;
  let next: ApplyResult;
  if (d.heroes.some((h) => h.dead)) {
    if (
      d.pressureSource === "curioProvision" &&
      d.heroes.find((h) => h.id === d.curio?.active?.heroId)?.dead
    ) {
      const cancelled = resolveCurioRows(result.state);
      return { ...cancelled, events: [...result.events, ...cancelled.events] };
    }
    next =
      d.pressureSource === "room"
        ? completeDungeonDarkRoom(result.state)
        : {
            state: {
              ...result.state,
              dungeon: {
                ...d,
                phase: "awaitingReplacement",
                pending: null,
                replacementResume:
                  d.pressureSource === "curioProvision"
                    ? "curio"
                    : d.pressureSource === "exploration"
                      ? "exploration"
                      : "ready",
              },
            },
            events: [],
          };
  } else if (d.heroes.some((h) => h.stress === 10)) {
    next = resolveDungeonPressure({ ...result.state, dungeon: { ...d, phase: "blockedPressure" } });
  } else {
    next =
      d.pressureSource === "room"
        ? completeDungeonDarkRoom(result.state)
        : {
            state: {
              ...result.state,
              dungeon: {
                ...d,
                phase: d.pressureSource === "curioProvision" ? "awaitingCurio" : "ready",
                pending: null,
              },
            },
            events: [],
          };
  }
  return { ...next, events: [...result.events, ...next.events] };
}

/** R12 / R-027：已完成效果间使用实际 Torch；本切片不允许插入待选或房间结算。 */
export function useDungeonTorch(state: GameState, command: UseProvisionCommand): ApplyResult {
  const d = state.dungeon;
  const pool = d?.explorationSetup?.provisions;
  const target = d?.heroes.find((h) => h.id === command.targetId && !h.dead);
  if (
    !d ||
    state.battle ||
    !dungeonProvisionWindow(d) ||
    d.pending ||
    command.effect !== "raiseLight" ||
    d.roomCards?.active ||
    d.monsterPool?.active ||
    d.pendingCurioDraw ||
    (d.roomResolution && !d.roomResolution.completed) ||
    !target ||
    !pool ||
    pool.length > 16 ||
    new Set(pool.map((p) => p.id)).size !== pool.length ||
    !pool.some((p) => p.id === command.provisionId && p.face === "torch")
  )
    return rejectBattleCommand(
      state,
      "地牢补给须在完整效果之间使用 Torch 提升光照，不能插入待选或意志检定",
    );
  const clearDark = warmUpDarkRoomNeedsTorch(d);
  const changed = changeDungeonLight(
    {
      ...state,
      dungeon: {
        ...d,
        ...(clearDark
          ? { rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)) }
          : {}),
        pressureSource: d.phase === "awaitingCurio" ? "curioProvision" : "provision",
        explorationSetup: {
          ...d.explorationSetup!,
          provisions: pool.filter((p) => p.id !== command.provisionId),
        },
      },
    },
    Math.min(5, d.explorationSetup!.light + 1),
  );
  const refused = changed.events.find((e) => e.type === "commandRefused");
  if (refused) return rejectBattleCommand(state, refused.message);
  return settleDungeonLight({
    ...changed,
    events: [
      {
        type: "provisionConsumed",
        entityId: target.id,
        provisionId: command.provisionId,
        face: "torch",
        effect: "raiseLight",
        message: "使用 Torch：光照 +1，移除一颗补给骰（R12）",
      },
      ...changed.events,
      ...(clearDark
        ? [
            {
              type: "dungeonUpdated" as const,
              message: `Warm Up the Halls：暗房 ${d.position} 已用Torch点亮并清理；XP留待回村结算（QUEST p11、R-045）`,
            },
          ]
        : []),
    ],
  });
}
