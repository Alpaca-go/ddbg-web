import { prepareBossObjectiveRoom } from "./boss/objective-room-entry";
import { basicQuests, readBasicQuest } from "../../data/src/basic-quests";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { readRoomTile } from "./room-tile-selection";
import { roomCatalogSchema } from "../../data/src/room";
import { createRng } from "./rng";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});
const finish = (state: GameState, dungeon: DungeonState, message: string): ApplyResult => ({
  state: { ...state, dungeon },
  events: [{ type: "dungeonUpdated", message }],
  ...(dungeon.pending ? { pendingChoice: dungeon.pending } : {}),
});

export function readSetAsideRoomCardId(d: DungeonState): string | undefined {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "setAsideRoomCardId" in quest ? quest.setAsideRoomCardId : d.setAsideRoomCardId;
}

export function readSetAsideRoomCardIds(d: DungeonState): readonly string[] {
  const quest = readBasicQuest(d.questDistribution);
  if (quest && "setAsideRoomCardIds" in quest) return quest.setAsideRoomCardIds;
  const single = readSetAsideRoomCardId(d);
  return single ? [single] : [];
}

export function readObjectiveRecoveryActions(d: DungeonState): number | undefined {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "objectiveRecoveryActions" in quest ? quest.objectiveRecoveryActions : undefined;
}

export function readObjectiveRecoveryStepLabel(d: DungeonState): string {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "objectiveRecoveryStepLabel" in quest
    ? quest.objectiveRecoveryStepLabel
    : "完成任务目标";
}

function objectiveRecoveryQuestRef(d: DungeonState): string {
  const id = readBasicQuest(d.questDistribution)?.id;
  const page = id?.match(/^quest:p0?(\d+)$/)?.[1];
  return page ? `QUEST p${Number(page)}` : "任务卡 SPECIAL";
}

/** 出征旁置任务房间牌，随机遭遇堆只洗其余八张（R15、QUEST p4）。 */
export function embarkSetAsideRoomCardId(questId: string): string | undefined {
  const quest = basicQuests.find((q) => q.id === questId);
  return quest && "setAsideRoomCardId" in quest ? quest.setAsideRoomCardId : undefined;
}

export function ruinsRoomDeckWithoutSetAside(
  cards: readonly { readonly id: string; readonly location: string; readonly boss?: boolean }[],
  setAsideRoomCardId?: string | readonly string[],
) {
  const pool = cards.filter((c) => c.location === "ruins" && !c.boss);
  const aside =
    typeof setAsideRoomCardId === "string" ? [setAsideRoomCardId] : (setAsideRoomCardId ?? []);
  if (!aside.length) return pool.map((c) => c.id);
  if (
    new Set(aside).size !== aside.length ||
    aside.some((id) => !pool.some((c) => c.id === id)) ||
    pool.length !== 9
  )
    throw new Error("旁置房间牌需要完整九张遗迹普通房间目录（R-048）");
  return pool.filter((c) => !aside.includes(c.id)).map((c) => c.id);
}

export function allRuinsRoomCardIds(
  d: Pick<DungeonState, "roomCards" | "setAsideRoomCardId" | "questDistribution">,
  activeCardId?: string,
) {
  const c = d.roomCards;
  if (!c) return [];
  const aside = readSetAsideRoomCardIds(d as DungeonState);
  const active = activeCardId ?? c.active?.cardId;
  const defaultDeck = ruinsRoomDeckWithoutSetAside(c.cards, aside);
  const inDeck = c.deck ?? defaultDeck;
  const ids = [...inDeck, ...(c.discard ?? [])];
  if (active && !ids.includes(active)) ids.push(active);
  for (const id of aside) if (!ids.includes(id)) ids.push(id);
  return ids;
}

/** R15：目标房守卫战使用旁置牌或从八张堆抽顶，不洗回旁置牌。 */
export function prepareObjectiveRoomBattle(state: GameState): ApplyResult | null {
  const d = state.dungeon!;
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "objective") return null;
  if (d.faceTheThreatEmbarkPlan?.roomPlacement === "edgeRoomsR30")
    return prepareBossObjectiveRoom(state);
  const aside = readSetAsideRoomCardIds(d);
  const c = d.roomCards;
  if (!c || !roomCatalogSchema.safeParse(c.cards).success)
    return refuse(state, "需要完整核心盒房间目录（R-048）");
  if (c.active) return refuse(state, "该房间牌已记录；不能重抽（R15）");
  if (aside.length) {
    if (!Number.isSafeInteger(d.cursor) || d.cursor < 0)
      return refuse(state, "随机游标无效，未选择目标房间（R-048）");
    const candidates = aside.map((id) =>
      c.cards.find((entry) => entry.id === id && entry.location === "ruins" && !entry.boss),
    );
    if (candidates.some((card) => !card))
      return refuse(state, "旁置目标房间牌不在遗迹目录中（R-048）");
    const available = allRuinsRoomCardIds(d);
    if (
      available.length !== 9 ||
      new Set(available).size !== 9 ||
      available.some(
        (id) => !c.cards.some((card) => card.id === id && card.location === "ruins" && !card.boss),
      ) ||
      (c.deck ?? []).some((id) => aside.includes(id)) ||
      (c.discard ?? []).some((id) => aside.includes(id))
    )
      return refuse(state, "旁置目标房间与普通牌堆不守恒（R15、R-048）");
    let cursor = d.cursor,
      index = 0;
    if (candidates.length > 1) {
      const rng = createRng(state.seed);
      for (let i = 0; i < cursor; i++) rng.next();
      index = Math.floor(rng.next() * candidates.length);
      cursor++;
    }
    const card = candidates[index]!;
    const selected = readRoomTile(card);
    const blockedReason =
      selected.status === "matched"
        ? `${selected.tile.name} 为任务旁置房间；下一步从怪物牌堆抽牌并进入守卫战（R15）。房间未清理。`
        : `${card.name} ${selected.reason}；旁置房间不能替换（R-048）`;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          cursor,
          roomCards: {
            ...c,
            active: {
              roomId: room.id,
              cardId: card.id,
              ...(selected.status === "matched" ? { tileId: selected.tile.id } : {}),
              blockedReason,
            },
          },
        },
      },
      events: [
        { type: "dungeonUpdated", message: `目标房使用旁置 ${card.name}：${blockedReason}` },
      ],
    };
  }
  return null;
}

/** 守卫战胜利后：Dem Bones 等须拾取目标才算清理（任务卡 SPECIAL RULES）。 */
export function beginDungeonObjectiveRoom(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const room = d.rooms.find((r) => r.id === d.position);
  const recovery = readObjectiveRecoveryActions(d);
  const active = d.roomResolution;
  if (
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room?.kind !== "objective" ||
    room.cleared ||
    d.mustLeaveRoomId === d.position
  )
    return refuse(state, "需要未清理的目标房与有效停点（R15）");
  if (!recovery) return refuse(state, "该任务目标房拾取规则尚未接线；不能假定已清理（R-048）");
  if (!active || active.kind !== "objective" || active.roomId !== d.position || active.completed)
    return refuse(
      state,
      `目标房须先赢得守卫战，再花费行动${readObjectiveRecoveryStepLabel(d)}（R15、${objectiveRecoveryQuestRef(d)}）`,
    );
  const remaining = active.actionsRemaining ?? 0;
  if (remaining <= 0) return refuse(state, "目标拾取已完成或状态无效");
  const heroes = d.heroes.filter((h) => !h.dead);
  if (!heroes.length) return refuse(state, "没有存活英雄可拾取目标");
  const step = readObjectiveRecoveryStepLabel(d);
  const questRef = objectiveRecoveryQuestRef(d);
  const pending = {
    id: `dungeon-objective-recover:${d.decision}`,
    prompt: `目标房 ${d.position}：选择 1 名英雄花费 1 行动${step}（剩余 ${remaining} / ${recovery}，${questRef}）`,
    options: heroes.map((h) => ({
      id: h.id,
      label: `${h.id} 花费 1 行动${step}`,
    })),
  };
  return finish(state, { ...d, decision: d.decision + 1, pending }, "等待英雄完成任务目标");
}

export function chooseObjectiveRecovery(
  state: GameState,
  command: { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon!;
  const active = d.roomResolution;
  const pending = d.pending;
  const recovery = readObjectiveRecoveryActions(d);
  if (
    d.phase !== "awaitingRoom" ||
    !pending?.id.startsWith("dungeon-objective-recover:") ||
    command.choiceId !== pending.id ||
    !recovery ||
    !active ||
    active.kind !== "objective" ||
    active.completed ||
    active.roomId !== d.position
  )
    return refuse(state, "目标拾取选择无效或已过期");
  const hero = d.heroes.find((h) => h.id === command.optionId);
  if (!hero || hero.dead) return refuse(state, "英雄无效或已死亡");
  const remaining = (active.actionsRemaining ?? 0) - 1;
  if (remaining < 0) return refuse(state, "目标拾取行动已用尽");
  const step = readObjectiveRecoveryStepLabel(d);
  const questRef = objectiveRecoveryQuestRef(d);
  if (remaining > 0) {
    const nextPending = {
      id: `dungeon-objective-recover:${d.decision}`,
      prompt: `目标房 ${d.position}：再花费 1 行动${step}（剩余 ${remaining} / ${recovery}，${questRef}）`,
      options: d.heroes
        .filter((h) => !h.dead)
        .map((h) => ({ id: h.id, label: `${h.id} 花费 1 行动${step}` })),
    };
    return finish(
      state,
      {
        ...d,
        decision: d.decision + 1,
        pending: nextPending,
        roomResolution: { ...active, actionsRemaining: remaining },
      },
      `${hero.id} 已花费 1 行动${step}（${recovery - remaining}/${recovery}）`,
    );
  }
  return finish(
    state,
    {
      ...d,
      pending: null,
      phase: d.heroes.some((h) => h.dead) ? "awaitingReplacement" : "ready",
      roomResolution: { ...active, actionsRemaining: 0, completed: true },
      rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
    },
    `${hero.id} 完成${step}，目标房 ${d.position} 已清理（${questRef}）`,
  );
}

export function objectiveRoomResolutionAfterVictory(
  d: DungeonState,
  roomId: string,
): DungeonState["roomResolution"] {
  const recovery = readObjectiveRecoveryActions(d);
  if (!recovery) return undefined;
  return {
    kind: "objective",
    roomId,
    dungeonLevel: d.explorationSetup?.dungeonLevel ?? 1,
    resolvedHeroIds: [],
    actionsRemaining: recovery,
    completed: false,
  };
}

export function objectiveRoomClearsOnVictory(
  d: DungeonState,
  roomKind: string | undefined,
): boolean {
  if (roomKind !== "objective") return true;
  return readObjectiveRecoveryActions(d) === undefined;
}
