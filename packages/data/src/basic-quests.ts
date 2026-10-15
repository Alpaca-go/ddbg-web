import scout from "../normalized/corebox/scout_ahead_distribution.json";
import wipe from "../normalized/corebox/wipe_em_out_distribution.json";
import fundraiser from "../normalized/corebox/fundraiser_distribution.json";
import reduceToRubble from "../normalized/corebox/reduce_to_rubble_distribution.json";
import clearThePath from "../normalized/corebox/clear_the_path_distribution.json";
import { roomDistributionSchema } from "./dungeon-layout";

/** 官方R15 / R29、QUEST：已核对可出征任务；未决特殊规则或未审房间图标仍停点。 */
export const basicQuests = [
  {
    id: "quest:p001",
    name: "Scout Ahead I",
    level: 1 as const,
    restPoints: 8,
    xpKind: "all",
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(scout),
  },
  {
    id: "quest:p002",
    name: "Wipe ‘Em Out I",
    level: 1 as const,
    restPoints: 12,
    xpKind: "lair",
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(wipe),
  },
  {
    id: "quest:p003",
    name: "Fundraiser I",
    level: 1 as const,
    restPoints: 8,
    xpKind: "gold",
    roomsPerXp: 20,
    maxRooms: 2,
    distribution: roomDistributionSchema.parse(fundraiser),
  },
  {
    id: "quest:p007",
    name: "Clear the Path II",
    level: 2 as const,
    restPoints: 8,
    xpKind: "all",
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(clearThePath),
  },
  {
    id: "quest:p008",
    name: "Reduce to Rubble II",
    level: 2 as const,
    restPoints: 12,
    xpKind: "lair",
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(reduceToRubble),
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
  if (!quest || !matchesQuestCounts(parsed.data.counts, quest.distribution.counts)) return null;
  return quest;
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
