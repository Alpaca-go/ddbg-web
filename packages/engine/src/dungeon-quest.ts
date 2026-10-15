import { dungeonLayoutSchema } from "../../data/src/dungeon-layout";
import {
  questRoomsSchema,
  dungeonQuestSummarySchema,
  fundraiserQuestSummarySchema,
} from "../../data/src/quest-summary";
import { matchesQuestCounts, readBasicQuest } from "../../data/src/basic-quests";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";

/** 已核对QUEST：按初始任务身份核构成与目标，不从地图或房间名猜测。 */
export function readDungeonQuestProgress(d: DungeonState) {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const quest = readBasicQuest(d.questDistribution);
  const layout = dungeonLayoutSchema.safeParse(d.layout);
  const rooms = questRoomsSchema.safeParse(d.rooms);
  if (!quest || !layout.success || !rooms.success)
    return refuse("任务身份或清理记录缺失 / 无效；仅接已核对基础任务（R-048）");
  const slots = layout.data.nodes.filter((n) => n.kind === "room").map((n) => n.id);
  const actualCounts = [...new Set(rooms.data.map((r) => r.kind))].map((kind) => ({
    kind,
    count: rooms.data.filter((r) => r.kind === kind).length,
  }));
  if (
    !matchesQuestCounts(actualCounts, quest.distribution.counts) ||
    rooms.data.length !== slots.length ||
    new Set(rooms.data.map((r) => r.id)).size !== slots.length ||
    rooms.data.some(
      (r) =>
        !slots.includes(r.id) ||
        (r.cleared && (!r.revealed || r.kind === "trap" || r.kind === "dark")),
    ) ||
    layout.data.unresolvedMarkers?.length ||
    layout.data.nodes.some((n) => n.kind === "unresolved") ||
    d.roomCards?.active ||
    d.monsterPool?.active ||
    d.curio?.active ||
    d.pendingCurioDraw ||
    (d.explorationSetup && d.explorationSetup.dungeonLevel !== quest.level) ||
    d.exploration?.rolls?.some((r) => !r.resolved) ||
    (d.roomResolution && !d.roomResolution.completed)
  )
    return refuse("任务代币 / 房间槽 / 清理或结算记录不一致，不计算 XP（R15、R-038、R-048）");
  const clearedRoomIds = rooms.data
    .filter((r) => r.cleared)
    .map((r) => r.id)
    .sort();
  const completedRoomIds = rooms.data
    .filter(
      (r) =>
        r.cleared &&
        (quest.xpKind === "all" || r.kind === (quest.xpKind === "gold" ? "lair" : quest.xpKind)),
    )
    .map((r) => r.id)
    .sort();
  return { status: "matched" as const, clearedRoomIds, completedRoomIds, quest };
}

export function summarizeDungeonQuest(state: GameState): ApplyResult {
  const d = state.dungeon;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (!d || state.battle || d.phase !== "exited" || d.pending || d.questSummary)
    return refuse("须先全员离开地牢，任务摘要只能生成一次");
  const progress = readDungeonQuestProgress(d);
  if (progress.status === "refused") return refuse(progress.reason);
  const { completedRoomIds: clearedRoomIds, quest } = progress;
  if (quest.id === "quest:p003") {
    if (!Number.isSafeInteger(d.gold) || d.gold < 0 || (d.lootPool && d.lootPool.gold !== d.gold))
      return refuse("共享金币 / 战利品金币不一致，不能捐献");
    if (!clearedRoomIds.length) {
      const questSummary = fundraiserQuestSummarySchema.parse({
        questId: quest.id,
        name: quest.name,
        clearedRoomIds,
        earlyLeave: true,
        objectiveMet: false,
        lairClearedCount: 0,
        donatedGold: 0,
        xpPerHero: 0,
        stagecoachXp: 0,
        awarded: false,
      });
      return {
        state: { ...state, dungeon: { ...d, questSummary } },
        events: [
          {
            type: "dungeonUpdated",
            message:
              "Fundraiser提前离开：最低巢穴目标未完成，保留金币，跳过捐献；不判任务或战役失败（R-068）",
          },
        ],
      };
    }

    const pending = {
      id: `dungeon-fundraiser:${d.decision}`,
      prompt:
        "Fundraiser：选择给继承人的金币；每20金币1XP，最多捐60金币，超出不再加XP（R-038）。0金币表示不捐献。",
      options: [
        ...Array.from({ length: Math.min(60, d.gold) + 1 }, (_, gold) => ({
          id: `give:${gold}`,
          label: `捐献${gold}金币 · 待发${Math.floor(gold / 20)}XP`,
        })),
        { id: "cancel", label: "取消捐献" },
      ],
    };
    return {
      state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
      events: [
        {
          type: "dungeonUpdated",
          message: "最低巢穴目标已完成；等待捐献选择，尚未扣金币或生成摘要",
        },
      ],
      pendingChoice: pending,
    };
  }
  const xpPerHero = Math.min(3, Math.floor(clearedRoomIds.length / quest.roomsPerXp));
  const questSummary = dungeonQuestSummarySchema.parse({
    questId: quest.id,
    name: quest.name,
    clearedRoomIds,
    xpPerHero,
    stagecoachXp: xpPerHero,
    awarded: false,
  });
  return {
    state: { ...state, dungeon: { ...d, questSummary } },
    events: [
      {
        type: "dungeonUpdated",
        message: `${quest.name}：${quest.xpKind === "lair" ? "巢穴" : "房间"}清理 ${clearedRoomIds.length} 间，每名英雄与驿站待发 ${xpPerHero} XP；回村发放尚未接线（R29、R-038）`,
      },
    ],
  };
}

export function resolveFundraiserGold(
  state: GameState,
  command: { readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (
    !d ||
    state.battle ||
    d.phase !== "exited" ||
    d.questSummary ||
    !d.pending?.id.startsWith("dungeon-fundraiser:") ||
    command.choiceId !== d.pending.id ||
    !d.pending.options.some((o) => o.id === command.optionId)
  )
    return refuse("捐献选择无效或已过期");
  if (command.optionId === "cancel")
    return {
      state: { ...state, dungeon: { ...d, pending: null } },
      events: [{ type: "dungeonUpdated", message: "取消捐献选择，未扣金币" }],
    };
  const progress = readDungeonQuestProgress(d);
  const match = /^give:(0|[1-9]\d*)$/.exec(command.optionId);
  const gold = match ? Number(match[1]) : NaN;
  if (
    progress.status !== "matched" ||
    progress.quest.id !== "quest:p003" ||
    !progress.completedRoomIds.length ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    !Number.isSafeInteger(gold) ||
    gold > Math.min(60, d.gold) ||
    (d.lootPool && d.lootPool.gold !== d.gold)
  )
    return refuse("任务 / 最低目标 / 捐献金额 / 共享金币无效，未提交");
  const xp = Math.floor(gold / 20);
  const questSummary = fundraiserQuestSummarySchema.parse({
    questId: "quest:p003",
    name: "Fundraiser I",
    clearedRoomIds: progress.completedRoomIds,
    earlyLeave: false,
    objectiveMet: true,
    lairClearedCount: progress.completedRoomIds.length,
    donatedGold: gold,
    xpPerHero: xp,
    stagecoachXp: xp,
    awarded: false,
  });
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        pending: null,
        gold: d.gold - gold,
        ...(d.lootPool ? { lootPool: { ...d.lootPool, gold: d.gold - gold } } : {}),
        questSummary,
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Fundraiser捐献${gold}金币，每名英雄与驿站待发${xp}XP；回村发放尚未接线（R29、R-038）`,
      },
    ],
  };
}
