import scout from "../normalized/corebox/scout_ahead_distribution.json";
import wipe from "../normalized/corebox/wipe_em_out_distribution.json";
import { roomDistributionSchema } from "./dungeon-layout";

/** 官方R15 / R29、QUEST p1–2：无专属房间规则的I级任务；不借此开放其他任务。 */
export const basicQuests = [
  {
    id: "quest:p001",
    name: "Scout Ahead I",
    restPoints: 8,
    xpKind: "all",
    roomsPerXp: 2,
    maxRooms: 6,
    distribution: roomDistributionSchema.parse(scout),
  },
  {
    id: "quest:p002",
    name: "Wipe ‘Em Out I",
    restPoints: 12,
    xpKind: "lair",
    roomsPerXp: 1,
    maxRooms: 3,
    distribution: roomDistributionSchema.parse(wipe),
  },
] as const;
export type BasicQuestId = (typeof basicQuests)[number]["id"];

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
