import scout from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { dungeonLayoutSchema, roomDistributionSchema } from "../../data/src/dungeon-layout";
import { questRoomsSchema, scoutQuestSummarySchema } from "../../data/src/quest-summary";
import type { ApplyResult, GameState } from "./command";

/** Scout Ahead I：每清理两个房间得1 XP；身份来自初始任务，不从地图或房间名猜测。 */
export function summarizeDungeonQuest(state: GameState): ApplyResult {
  const d = state.dungeon;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (!d || state.battle || d.phase !== "exited" || d.pending || d.questSummary)
    return refuse("须先全员离开地牢，任务摘要只能生成一次");
  const quest = roomDistributionSchema.safeParse(d.questDistribution);
  const layout = dungeonLayoutSchema.safeParse(d.layout);
  const rooms = questRoomsSchema.safeParse(d.rooms);
  if (!quest.success || !layout.success || !rooms.success || quest.data.questId !== scout.questId)
    return refuse("任务身份或清理记录缺失 / 无效；仅接已核对 Scout Ahead I（R-048）");
  const matchesCounts = (counts: readonly { kind: string; count: number }[]) =>
    counts.length === scout.counts.length &&
    scout.counts.every((expected) =>
      counts.some((c) => c.kind === expected.kind && c.count === expected.count),
    );
  const slots = layout.data.nodes.filter((n) => n.kind === "room").map((n) => n.id);
  const actualCounts = [...new Set(rooms.data.map((r) => r.kind))].map((kind) => ({
    kind,
    count: rooms.data.filter((r) => r.kind === kind).length,
  }));
  if (
    !matchesCounts(quest.data.counts) ||
    !matchesCounts(actualCounts) ||
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
  const xpPerHero = Math.min(3, Math.floor(clearedRoomIds.length / 2));
  const questSummary = scoutQuestSummarySchema.parse({
    questId: quest.data.questId,
    name: "Scout Ahead I",
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
        message: `Scout Ahead I：清理 ${clearedRoomIds.length} 间，每名英雄与驿站待发 ${xpPerHero} XP；回村发放尚未接线（R29、R-038）`,
      },
    ],
  };
}
