import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { preparePoolRebirthPayment } from "./pool-rebirth-payment";
import { storePoolRebirthInStagecoach } from "./pool-rebirth-stagecoach";

export type PoolRebirthRoom = {
  readonly roomId: string;
  readonly status: "available" | "used" | "declined";
};

/** 仅由实际房间牌的胜利交接登记，不能靠进入已清理房间伪造机会。 */
export function registerPoolRebirthClear(
  result: ApplyResult,
  cardId: string,
  victory: boolean,
): ApplyResult {
  const d = result.state.dungeon;
  if (
    !d ||
    !victory ||
    cardId !== "room:p014" ||
    d.poolRebirthRooms?.some((r) => r.roomId === d.position)
  )
    return result;
  return {
    ...result,
    state: {
      ...result.state,
      dungeon: {
        ...d,
        poolRebirthRooms: [
          ...(d.poolRebirthRooms ?? []),
          { roomId: d.position, status: "available" },
        ],
      },
    },
  };
}

function candidates(state: GameState) {
  const d = state.dungeon!;
  const alive = [...d.heroes, ...(d.stagecoachHeroes ?? [])].filter((h) => !h.dead);
  const name = (id: string | undefined) =>
    d.battleCatalog?.heroStats.find((s) => s.id === id)?.name;
  return (d.fallenHeroes ?? []).filter(
    (f) =>
      !f.revived &&
      name(f.hero.heroStatId) &&
      !alive.some((h) => name(h.heroStatId) === name(f.hero.heroStatId)),
  );
}

export function continuePoolRebirth(result: ApplyResult): ApplyResult {
  const d = result.state.dungeon;
  if (
    result.events.some((e) => e.type === "commandRefused") ||
    !d ||
    result.state.battle ||
    d.pending ||
    d.deathTrinketChoice ||
    d.replacementPreparation ||
    d.campaignFailure ||
    !["ready", "awaitingReplacement"].includes(d.phase) ||
    !d.rooms.some((r) => r.id === d.position && r.cleared) ||
    !d.poolRebirthRooms?.some((r) => r.roomId === d.position && r.status === "available")
  )
    return result;
  const pending = {
    id: `pool-rebirth:${d.decision}`,
    prompt:
      "重生池：本次清场仅一次机会，可全队各承受压力+4复活一名英雄进入驿站；放弃也结束机会（R-150/R-151）",
    options: [
      ...candidates(result.state).map((f) => ({
        id: f.hero.id,
        label: `复活 ${d.battleCatalog!.heroStats.find((s) => s.id === f.hero.heroStatId)!.name}（保留原等级、XP及持牌）`,
      })),
      { id: "decline", label: "放弃本次复活机会" },
    ],
  };
  return {
    ...result,
    state: { ...result.state, dungeon: { ...d, decision: d.decision + 1, pending } },
    pendingChoice: pending,
  };
}

export function choosePoolRebirth(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    !d.pending?.id.startsWith("pool-rebirth:") ||
    d.pending.id !== choiceId ||
    !d.pending.options.some((o) => o.id === optionId) ||
    !d.rooms.some((r) => r.id === d.position && r.cleared) ||
    !d.poolRebirthRooms?.some((r) => r.roomId === d.position && r.status === "available")
  )
    return rejectBattleCommand(state, "重生池机会不存在、已使用或选择过期");
  if (optionId === "decline")
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          pending: null,
          poolRebirthRooms: d.poolRebirthRooms.map((r) =>
            r.roomId === d.position ? { ...r, status: "declined" } : r,
          ),
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: "重生池：已放弃本次机会，离开重返不会重新开启（R-150）",
        },
      ],
    };
  if (!candidates(state).some((f) => f.hero.id === optionId))
    return rejectBattleCommand(state, "复活身份已不可用");
  const prepared = preparePoolRebirthPayment(
    { ...state, dungeon: { ...d, pending: null, phase: "ready" } },
    optionId,
  );
  if (prepared.status === "refused") return rejectBattleCommand(state, prepared.reason);
  const stored = storePoolRebirthInStagecoach(prepared);
  if (stored.status === "refused") return rejectBattleCommand(state, stored.reason);
  return {
    state: {
      ...state,
      dungeon: {
        ...stored.dungeon,
        pending: null,
        poolRebirthRooms: d.poolRebirthRooms.map((r) =>
          r.roomId === d.position ? { ...r, status: "used" } : r,
        ),
      },
    },
    events: [
      ...prepared.events,
      {
        type: "dungeonUpdated",
        message: "重生池：已完成压力支付与复活，英雄进入驿站，本次机会已消耗（R-147–151）",
      },
    ],
  };
}
