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
import fungalResearch from "../normalized/extension/weald/fungal_research_distribution.json";
import circleOfWitches from "../normalized/extension/weald/circle_of_witches_distribution.json";
import disinfection from "../normalized/extension/weald/disinfection_distribution.json";
import purgeTheWoods from "../normalized/extension/weald/purge_the_woods_distribution.json";
import patrolTheWoods from "../normalized/extension/weald/patrol_the_woods_distribution.json";
import {
  randomNonObjectiveRoomKinds,
  roomDistributionSchema,
  roomDistributionTokenTotal,
  type RoomDistribution,
} from "./dungeon-layout";
import { cardContentPack, packEnabled, type ContentPackId } from "./content-packs";
import type { QuestExpeditionRegion } from "./quest-map-pairing";

export type QuestXpKind =
  "all" | "lair" | "gold" | "objective" | "curio" | "dark" | "camp" | "flat" | "broughtBack";

/** R-246：卡面「1 XP / Necrotic Fungus brought back」计数对象（非清房）。 */
export type QuestBroughtBackSubject = "necroticFungus";

export type QuestPrintedXpCapOptions = {
  /** brought back 数量；`xpKind: broughtBack` 时必填。 */
  readonly broughtBackCount?: number;
};

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
    /** QUEST p4：开局旁置 room 7，目标房内使用 Tomb of Ancestor（R15、规格书 §5.1）。 */
    setAsideRoomCardId: "room:p007" as const,
    /** 任务卡 SPECIAL RULES：英雄须在区域内花费 2 行动拾取骨骸后目标房才算清理。 */
    objectiveRecoveryActions: 2 as const,
    objectiveRecoveryStepLabel: "拾取骨骸" as const,
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
    /** R-197 / QUEST p5：Curio 房必有守卫战；守卫生成只抽 1 只 II 级怪。 */
    curioRoomsAlwaysGuarded: true as const,
    curioRoomGuardMonsterLevel: 2 as const,
    distribution: roomDistributionSchema.parse(risingThreat),
  },
  {
    id: "quest:weald:p001",
    name: "Fungal Research",
    level: 1 as const,
    restPoints: 8,
    xpKind: "broughtBack" as const,
    roomsPerXp: 1,
    broughtBackSubject: "necroticFungus" as const,
    expeditionRegion: "weald" as const,
    setAsideRoomCardIds: ["room:weald:p003", "room:weald:p006", "room:weald:p008"] as const,
    verifiedRuleRulings: ["R-246", "R-240", "R-243", "R-038", "R-252"] as const,
    distribution: roomDistributionSchema.parse(fungalResearch),
  },
  {
    id: "quest:weald:p002",
    name: "Circle of Witches",
    level: 1 as const,
    restPoints: 12,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    expeditionRegion: "weald" as const,
    setAsideRoomCardId: "room:weald:p009" as const,
    questExceptionSpawn: {
      combatCardId: "monster_medium:weald:p015" as const,
      monsterLevel: 2 as const,
      count: 1 as const,
    },
    verifiedRuleRulings: ["R-244", "R-247", "R-240"] as const,
    distribution: roomDistributionSchema.parse(circleOfWitches),
  },
  {
    id: "quest:weald:p003",
    name: "Disinfection",
    level: 1 as const,
    restPoints: 8,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    expeditionRegion: "weald" as const,
    setAsideRoomCardId: "room:weald:p005" as const,
    startingPotions: 3 as const,
    verifiedRuleRulings: ["R-245", "R-240", "R-249"] as const,
    distribution: roomDistributionSchema.parse(disinfection),
  },
  {
    id: "quest:weald:p004",
    name: "Purge the Woods",
    level: 1 as const,
    restPoints: 4,
    xpKind: "lair" as const,
    roomsPerXp: 1,
    maxRooms: 3,
    expeditionRegion: "weald" as const,
    /** R-248：出征怪物池 `monsterDrawScope: wealdLocalOnly`（仅 14 张当地实例可抽）。 */
    monsterDrawScope: "wealdLocalOnly" as const,
    verifiedRuleRulings: ["R-241", "R-248", "R-249"] as const,
    distribution: roomDistributionSchema.parse(purgeTheWoods),
  },
  {
    id: "quest:weald:p005",
    name: "Patrol the Woods",
    level: 1 as const,
    restPoints: 8,
    xpKind: "all" as const,
    roomsPerXp: 2,
    maxRooms: 6,
    expeditionRegion: "weald" as const,
    verifiedRuleRulings: ["R-242", "R-249"] as const,
    distribution: roomDistributionSchema.parse(patrolTheWoods),
  },
  {
    id: "quest:p006",
    name: "Disruption II",
    /** R15 / QUEST p6: pick one of these set-aside rooms on each Objective entry. */
    setAsideRoomCardIds: ["room:p004", "room:p008"] as const,
    level: 2 as const,
    restPoints: 12,
    xpKind: "objective" as const,
    roomsPerXp: 1,
    maxRooms: 3,
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
    /** QUEST p10：开局旁置 room 3（Healing Fountain），同 Dem Bones 旁置 room 7（R15、规格书 §5.1）。 */
    setAsideRoomCardId: "room:p003" as const,
    /** 任务卡 SPECIAL：须花费 2 行动净化喷泉后目标房才算清理（R-197：额外消耗 1 个任务药水）。 */
    objectiveRecoveryActions: 2 as const,
    objectiveRecoveryStepLabel: "净化喷泉" as const,
    /** R-197：开局携带 3 个不可丢弃的任务药水（Potion）；净化额外耗 1 个。 */
    questStartingProvisions: [{ face: "potion", count: 3 }] as const,
    objectiveRecoveryProvision: "potion" as const,
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

/** 战役「抽 2 选 1」普通出征池（R33、R-030）；不含 Boss 任务卡（R-120）与未开放地点战役。 */
export function questsForCampaignLevel(level: CampaignLevel) {
  return basicQuests.filter(
    (q) =>
      q.level === level && !("bossQuest" in q && q.bossQuest) && q.expeditionRegion !== "weald",
  );
}

/** 按战役内容包过滤已登记任务（W-02；与 `sourcesForContentPacks` 同一 packEnabled 语义）。 */
export function questsForContentPacks(level: CampaignLevel, packs?: readonly ContentPackId[]) {
  return questsForCampaignLevel(level).filter((q) => packEnabled(packs, cardContentPack(q)));
}

export function basicQuestEnabledForContentPacks(
  questId: string,
  packs?: readonly ContentPackId[],
): boolean {
  const quest = basicQuests.find((q) => q.id === questId);
  if (!quest) return false;
  return packEnabled(packs, cardContentPack(quest));
}

/** 步骤 5 沙盒：p001 brought back、p004 R-248、p005 混池；村庄战役池仍排除全部 Weald。 */
export const SANDBOX_WEALD_EMBARK_QUEST_IDS = [
  "quest:weald:p001",
  "quest:weald:p004",
  "quest:weald:p005",
] as const;
export type SandboxWealdEmbarkQuestId = (typeof SANDBOX_WEALD_EMBARK_QUEST_IDS)[number];

export function isSandboxWealdEmbarkQuest(questId: string): questId is SandboxWealdEmbarkQuestId {
  return (SANDBOX_WEALD_EMBARK_QUEST_IDS as readonly string[]).includes(questId);
}

/** 沙盒 / 调试出征：I 级普通任务 + 已接通的 Boss 任务卡（R-120）；不含未开放 Weald 地点。 */
export function sandboxEmbarkQuests() {
  return basicQuests.filter(
    (q) => (q.level === 1 && q.expeditionRegion !== "weald") || ("bossQuest" in q && q.bossQuest),
  );
}

/** 按内容包追加已接线沙盒 Weald 任务（须含 weald 包）。 */
export function sandboxEmbarkQuestsForPacks(packs?: readonly ContentPackId[]) {
  const base = sandboxEmbarkQuests();
  if (!packs?.includes("weald")) return base;
  const extra = basicQuests.filter((q) => isSandboxWealdEmbarkQuest(q.id));
  return [...base, ...extra];
}

/** 任务卡印刷 XP 上限（R-038）；Boss 定额见 R-122 `flatXp`。 */
export function questPrintedXpCap(
  quest: (typeof basicQuests)[number],
  options?: QuestPrintedXpCapOptions,
): number {
  if (quest.xpKind === "flat") return quest.flatXp;
  if (quest.xpKind === "gold" || quest.xpKind === "camp") return 3;
  if (quest.xpKind === "broughtBack") {
    const count = options?.broughtBackCount;
    if (count === undefined) {
      throw new Error(
        `${quest.id}：questPrintedXpCap 需要 broughtBackCount（R-246；1 XP / Necrotic Fungus brought back）`,
      );
    }
    return Math.min(3, count * quest.roomsPerXp);
  }
  const roomQuest = quest as Extract<(typeof basicQuests)[number], { maxRooms: number }>;
  return Math.min(3, roomQuest.maxRooms / roomQuest.roomsPerXp);
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
