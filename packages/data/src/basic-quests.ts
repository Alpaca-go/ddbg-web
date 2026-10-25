import scout from "../normalized/corebox/scout_ahead_distribution.json";
import wipe from "../normalized/corebox/wipe_em_out_distribution.json";
import fundraiser from "../normalized/corebox/fundraiser_distribution.json";
import demBones from "../normalized/corebox/dem_bones_distribution.json";
import risingThreat from "../normalized/corebox/rising_threat_distribution.json";
import disruption from "../normalized/corebox/disruption_distribution.json";
import reduceToRubble from "../normalized/corebox/reduce_to_rubble_distribution.json";
import clearThePath from "../normalized/corebox/clear_the_path_distribution.json";
import breakThem from "../normalized/corebox/break_them_distribution.json";
import purifyTheFountains from "../normalized/corebox/purify_the_fountains_distribution.json";
import warmUpTheHalls from "../normalized/corebox/warm_up_the_halls_distribution.json";
import theyAreBack from "../normalized/corebox/they_are_back_distribution.json";
import creepingDarkness from "../normalized/corebox/creeping_darkness_distribution.json";
import theThreatIsReal from "../normalized/corebox/the_threat_is_real_distribution.json";
import forwardCamps from "../normalized/corebox/forward_camps_distribution.json";
import {
  randomNonObjectiveRoomKinds,
  roomDistributionSchema,
  roomDistributionTokenTotal,
  type RoomDistribution,
} from "./dungeon-layout";

export type QuestXpKind = "all" | "lair" | "gold" | "objective" | "curio" | "dark";

/** 官方R15 / R29、QUEST：已核对可出征任务；未决特殊规则或未审房间图标仍停点。 */
export const basicQuests = [
  {
    id: "quest:p001",
    name: "Scout Ahead I",
    level: 1 as const,
    restPoints: 8,
    xpKind: "all" as const,
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(scout),
  },
  {
    id: "quest:p002",
    name: "Wipe ‘Em Out I",
    level: 1 as const,
    restPoints: 12,
    xpKind: "lair" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(wipe),
  },
  {
    id: "quest:p003",
    name: "Fundraiser I",
    level: 1 as const,
    restPoints: 8,
    xpKind: "gold" as const,
    roomsPerXp: 20,
    maxRooms: 2,
    distribution: roomDistributionSchema.parse(fundraiser),
  },
  {
    id: "quest:p004",
    name: "Dem Bones I",
    level: 1 as const,
    restPoints: 8,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 1,
    distribution: roomDistributionSchema.parse(demBones),
  },
  {
    id: "quest:p005",
    name: "Rising Threat I",
    level: 1 as const,
    restPoints: 12,
    xpKind: "curio" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(risingThreat),
  },
  {
    id: "quest:p006",
    name: "Disruption II",
    level: 2 as const,
    restPoints: 12,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 2,
    distribution: roomDistributionSchema.parse(disruption),
  },
  {
    id: "quest:p007",
    name: "Clear the Path II",
    level: 2 as const,
    restPoints: 8,
    xpKind: "all" as const,
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(clearThePath),
  },
  {
    id: "quest:p008",
    name: "Reduce to Rubble II",
    level: 2 as const,
    restPoints: 12,
    xpKind: "lair" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(reduceToRubble),
  },
  {
    id: "quest:p009",
    name: "Break Them II",
    level: 2 as const,
    restPoints: 8,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(breakThem),
  },
  {
    id: "quest:p010",
    name: "Purify the Fountains II",
    level: 2 as const,
    restPoints: 12,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 1,
    distribution: roomDistributionSchema.parse(purifyTheFountains),
  },
  {
    id: "quest:p011",
    name: "Warm Up the Halls III",
    level: 3 as const,
    restPoints: 4,
    xpKind: "dark" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(warmUpTheHalls),
  },
  {
    id: "quest:p012",
    name: "Forward Camps III",
    level: 3 as const,
    restPoints: 8,
    // Q-112：印刷「1 Xp / Set up camp」；QuestXpKind 无 camp，本刀不接设营 XP 结算（勿误用 all/objective）。
    xpKind: "all" as const,
    roomsPerXp: 999,
    maxRooms: 8,
    distribution: roomDistributionSchema.parse(forwardCamps),
  },
  {
    id: "quest:p013",
    name: "They Are Back III",
    level: 3 as const,
    restPoints: 8,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(theyAreBack),
  },
  {
    id: "quest:p014",
    name: "Creeping Darkness III",
    level: 3 as const,
    restPoints: 8,
    xpKind: "all" as const,
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(creepingDarkness),
  },
  {
    id: "quest:p015",
    name: "The Threat is Real III",
    level: 3 as const,
    restPoints: 8,
    xpKind: "lair" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(theThreatIsReal),
  },
] as const;
export type BasicQuestId = (typeof basicQuests)[number]["id"];
export type CampaignLevel = 1 | 2 | 3;

export function questsForCampaignLevel(level: CampaignLevel) {
  return basicQuests.filter((q) => q.level === level);
}

export function readBasicQuest(input: unknown) {
  const parsed = roomDistributionSchema.safeParse(input);
  if (!parsed.success) return null;
  const quest = basicQuests.find((q) => q.id === parsed.data.questId);
  if (!quest || !storedDistributionMatchesQuest(parsed.data, quest.distribution)) return null;
  return quest;
}

/** 出征后 state 存展开 counts；模板 JSON 可含 randomizeNonObjective。 */
export function storedDistributionMatchesQuest(
  stored: RoomDistribution,
  template: RoomDistribution,
) {
  if (stored.questId !== template.questId) return false;
  if (!template.randomizeNonObjective) return matchesQuestCounts(stored.counts, template.counts);
  const fixed = template.counts;
  for (const f of fixed) {
    const row = stored.counts.find((c) => c.kind === f.kind);
    if (!row || row.count !== f.count) return false;
  }
  const fixedKinds = new Set(fixed.map((c) => c.kind));
  const randomRows = stored.counts.filter((c) => !fixedKinds.has(c.kind));
  const randomTotal = randomRows.reduce((n, c) => n + c.count, 0);
  if (randomTotal !== template.randomizeNonObjective) return false;
  if (randomRows.some((c) => !randomNonObjectiveRoomKinds.includes(c.kind))) return false;
  return roomDistributionTokenTotal(stored) === roomDistributionTokenTotal(template);
}
export function matchesQuestCounts(
  actual: readonly { kind: string; count: number }[],
  expected: readonly { kind: string; count: number }[],
) {
  return (
    actual.length === expected.length &&
    expected.every((e) => actual.some((a) => a.kind === e.kind && a.count === e.count))
  );
}
