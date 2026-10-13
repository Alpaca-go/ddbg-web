import { dungeonLayoutSchema } from "../../data/src/dungeon-layout";
import { questRoomsSchema, dungeonQuestSummarySchema } from "../../data/src/quest-summary";
import { matchesQuestCounts, readBasicQuest } from "../../data/src/basic-quests";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";

/** QUEST p1–2：按初始任务身份核构成与目标，不从地图或房间名猜测。 */
export function readDungeonQuestProgress(d: DungeonState) {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const quest = readBasicQuest(d.questDistribution);
  const layout = dungeonLayoutSchema.safeParse(d.layout);
  const rooms = questRoomsSchema.safeParse(d.rooms);
  if (!quest || !layout.success || !rooms.success)
    return refuse("任务身份或清理记录缺失 / 无效；仅接已核对I级基础任务（R-048）");
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
    (d.explorationSetup && d.explorationSetup.dungeonLevel !== 1) ||
    d.exploration?.rolls?.some((r) => !r.resolved) ||
    (d.roomResolution && !d.roomResolution.completed)
  )
    return refuse("任务代币 / 房间槽 / 清理或结算记录不一致，不计算 XP（R15、R-038、R-048）");
  const clearedRoomIds = rooms.data
    .filter((r) => r.cleared)
    .map((r) => r.id)
    .sort();
  const completedRoomIds = rooms.data
    .filter((r) => r.cleared && (quest.xpKind === "all" || r.kind === quest.xpKind))
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
