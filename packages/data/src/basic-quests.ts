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
import weAreTheFlame from "../normalized/corebox/we_are_the_flame_distribution.json";
import lightTheWay from "../normalized/corebox/light_the_way_distribution.json";
import bellyOfTheBeast from "../normalized/corebox/belly_of_the_beast_distribution.json";
import faceTheThreat from "../normalized/corebox/face_the_threat_distribution.json";
import {
  randomNonObjectiveRoomKinds,
  roomDistributionSchema,
  roomDistributionTokenTotal,
  type RoomDistribution,
} from "./dungeon-layout";
import type { QuestExpeditionRegion } from "./quest-map-pairing";

export type QuestXpKind =
  "all" | "lair" | "gold" | "objective" | "curio" | "dark" | "camp" | "flat";

/** 遗迹任务默认出征地点；单任务以 `expeditionRegion` 为准（R-116）。 */
export const basicQuestExpeditionRegion: QuestExpeditionRegion = "ruins";

export function asQuestMapPairingQuest(quest: (typeof basicQuests)[number]) {
  return {
    id: quest.id,
    distribution: quest.distribution,
    expeditionRegion: quest.expeditionRegion,
  };
}

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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
    distribution: roomDistributionSchema.parse(warmUpTheHalls),
  },
  {
    id: "quest:p012",
    name: "Forward Camps III",
    level: 3 as const,
    restPoints: 8,
    xpKind: "camp" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
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
    expeditionRegion: "ruins" as const,
    distribution: roomDistributionSchema.parse(theThreatIsReal),
  },
  {
    id: "quest:p016",
    name: "We Are The Flame",
    level: 3 as const,
    restPoints: 20,
    xpKind: "flat" as const,
    flatXp: 3 as const,
    expeditionRegion: "darkestDungeon" as const,
    bossQuest: true as const,
    distribution: roomDistributionSchema.parse(weAreTheFlame),
  },
  {
    id: "quest:p017",
    name: "Light the Way",
    level: 3 as const,
    restPoints: 20,
    xpKind: "flat" as const,
    flatXp: 3 as const,
    expeditionRegion: "darkestDungeon" as const,
    bossQuest: true as const,
    distribution: roomDistributionSchema.parse(lightTheWay),
  },
  {
    id: "quest:p018",
    name: "Belly of the Beast",
    level: 3 as const,
    restPoints: 20,
    xpKind: "flat" as const,
    flatXp: 3 as const,
    expeditionRegion: "darkestDungeon" as const,
    bossQuest: true as const,
    distribution: roomDistributionSchema.parse(bellyOfTheBeast),
  },
  {
    id: "quest:p019",
    name: "Face the Threat!",
    level: 3 as const,
    restPoints: 12,
    xpKind: "flat" as const,
    flatXp: 3 as const,
    expeditionRegion: "ruins" as const,
    bossQuest: true as const,
    distribution: roomDistributionSchema.parse(faceTheThreat),
  },
] as const;
export type BasicQuestId = (typeof basicQuests)[number]["id"];
export type CampaignLevel = 1 | 2 | 3;

/** 战役「抽 2 选 1」普通出征池（R33、R-030）；不含 Boss 任务卡（R-120）。 */
export function questsForCampaignLevel(level: CampaignLevel) {
  return basicQuests.filter((q) => q.level === level && !("bossQuest" in q && q.bossQuest));
}

/** 沙盒 / 调试出征：I 级普通任务 + 已接通的 Boss 任务卡（R-120）。 */
export function sandboxEmbarkQuests() {
  return basicQuests.filter((q) => q.level === 1 || ("bossQuest" in q && q.bossQuest));
}

/** 任务卡印刷 XP 上限（R-038）；Boss 定额见 R-122 `flatXp`。 */
export function questPrintedXpCap(quest: (typeof basicQuests)[number]): number {
  if (quest.xpKind === "flat") return quest.flatXp;
  if (quest.xpKind === "gold" || quest.xpKind === "camp") return 3;
  return Math.min(3, quest.maxRooms / quest.roomsPerXp);
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
