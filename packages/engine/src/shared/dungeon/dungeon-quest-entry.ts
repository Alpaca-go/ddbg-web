import { rebuildCoreQuestDecks } from "../quest/core-quest-decks";
import { drawInitialQuestOffers } from "../hamlet/initial-quest-draw";
import type { HamletQuestDrawOptionId } from "../hamlet/hamlet-location-quest-draw";
import {
  asQuestMapPairingQuest,
  basicQuestEnabledForContentPacks,
  basicQuests,
} from "../../../../data/src/core/quests/basic-quests";
import { sandboxExpeditionEmbarkBlockReason } from "../../../../data/src/core/quests/quest-map-pairing";
import { isSandboxWealdEmbarkQuest } from "../../../../data/src/core/quests/basic-quests";
import { rebuildLocationQuestDecks } from "../quest/location-quest-sources";
import { WEALD_APPROVED_ROOM_CARDS } from "../../weald/rooms/room-catalog";
import { pickEmbarkQuestMapLayout } from "../../../../data/src/core/quests/quest-map-pairing";
import type { BasicQuestId } from "../../../../data/src/core/quests/basic-quests";
import type { CurioCard } from "../../../../data/src/core/curios/curio";
import type { RoomCard } from "../../../../data/src/core/rooms/room";
import type { MonsterPoolCard } from "../../../../data/src/core/monsters/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog, DungeonState } from "./dungeon";
import type { ResolveCard } from "../core/pressure";
import type { SkillStance } from "../../core/heroes/hero-skill";
import { createConditionPool } from "../core/conditions";
import { trinketPoolProblem } from "../trinkets/trinket-acquisition";
import { isFormalHeroName } from "../../core/heroes/formal-heroes";
import {
  embarkSkillAllowed,
  isFormalHeroRosterPendingAttributes,
} from "../core/formal-roster-catalog";
import { FACE_THE_THREAT_QUEST_ID } from "../../core/bosses/quest-bridge";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../core/bosses/face-the-threat-embark-runtime";

import { placeFaceTheThreatRooms } from "../../core/bosses/edge-room-placement";

import { setupDarkestDungeon, isDarkestQuest } from "../../core/darkest/darkest-setup";
import type { GameState } from "../core/command";
import { sourcesForContentPacks } from "../core/content-packs";
import {
  normalizeContentPacks,
  type ContentPackId,
} from "../../../../data/src/shared/content-packs";

export type CoveQuestSources = {
  readonly curios: readonly CurioCard[];
  readonly rooms: readonly import("../../../../data/src/cove/rooms/room").CoveRoomCard[];
  readonly bossRoomSources: readonly import("../../../../data/src/cove/rooms/room").CoveBossRoomCard[];
};

export type WarrensQuestSources = {
  readonly bossRoomSources: readonly import("../../../../data/src/warrens/rooms/room").WarrensBossRoomCard[];
};

export type CoreQuestSources = {
  readonly weald?: import("../quest/location-quest-sources").WealdQuestSources;
  readonly cove?: CoveQuestSources;
  readonly warrens?: WarrensQuestSources;
  readonly catalog: DungeonBattleCatalog;
  readonly resolveCards: readonly ResolveCard[];
  readonly curios: readonly CurioCard[];
  readonly rooms: readonly RoomCard[];
  readonly monsters: readonly MonsterPoolCard[];
};
export type QuestParty = readonly {
  readonly heroStatId: string;
  readonly stance: SkillStance;
  readonly skillIds: readonly string[];
}[];

/**
 * R12–17/R35–36、R-038/048/065/121：单任务入口，无状态／代币注入，不代替战役选任务。
 * 开局四人须来自正式十八英雄目录（与替补白名单同一集合）。十八名 STAT 与 I–III
 * 级战斗技能均已核实（R-200）；未核实效果按 R-048 拒绝。
 */
export function createCoreDungeonQuest(
  seed: number,
  questId: BasicQuestId,
  mode: DungeonState["mode"],
  party: QuestParty,
  sources: CoreQuestSources,
  bossEdgeRooms = true,
  stygianRoomRules: DungeonState["stygianRoomRules"] | null = "full",
  contentPacks?: readonly ContentPackId[],
  initialQuestDrawMode?: HamletQuestDrawOptionId,
  whisperingWoodsQuest?: true,
  wealdHigherQuestOffers?: true | "tasks-v1",
) {
  if (contentPacks !== undefined) {
    contentPacks = normalizeContentPacks(contentPacks);
    sources = sourcesForContentPacks(sources, contentPacks);
  }
  const quest = basicQuests.find((quest) => quest.id === questId);
  if (wealdHigherQuestOffers && !contentPacks?.includes("weald"))
    throw new Error("高等级 Weald 任务版本需要 Weald 包");
  const advanced =
    wealdHigherQuestOffers === "tasks-v1" &&
    [
      "quest:weald:p006",
      "quest:weald:p007",
      "quest:weald:p008",
      "quest:weald:p009",
      "quest:weald:p010",
      "quest:weald:p011",
      "quest:weald:p012",
      "quest:weald:p013",
      "quest:weald:p014",
      "quest:weald:p015",
    ].includes(questId);
  const whispering = questId === "quest:weald:p015" && (whisperingWoodsQuest === true || advanced);
  if (advanced && initialQuestDrawMode !== undefined)
    throw new Error("高等级单任务不使用 I 级首趟抽选");
  if (
    (questId === "quest:weald:p015" || whisperingWoodsQuest !== undefined) &&
    (!whispering || initialQuestDrawMode !== undefined || !contentPacks?.includes("weald"))
  )
    throw new Error("Whispering Woods 需要显式版本、Weald 包与单任务入口");
  const sandboxEmbarkOk =
    quest &&
    (quest.level === 1 ||
      ("bossQuest" in quest && quest.bossQuest) ||
      isSandboxWealdEmbarkQuest(questId) ||
      whispering ||
      advanced);
  const locationBlock = quest
    ? sandboxExpeditionEmbarkBlockReason(
        quest.expeditionRegion,
        questId,
        contentPacks,
        wealdHigherQuestOffers,
      )
    : null;
  if (locationBlock && !whispering && !advanced) throw new Error(locationBlock);
  if (!basicQuestEnabledForContentPacks(questId, contentPacks))
    throw new Error("任务与所选内容包不一致，未创建地牢");
  if (
    !sandboxEmbarkOk ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !["standard", "radiant", "stygian"].includes(mode)
  )
    throw new Error("请选择已接通的沙盒出征任务、模式及32位非负整数种子");
  if (
    party.length !== 4 ||
    new Set(party.map((hero) => hero.stance)).size !== 4 ||
    party.some((hero) => !["aggressive", "defensive", "ranged", "support"].includes(hero.stance))
  )
    throw new Error("需要四名正式目录英雄且各占一个姿态");
  const selectedNames: string[] = [];
  const heroes = party.map((selected, index) => {
    const stat = sources.catalog.heroStats.find(
      (stat) => stat.id === selected.heroStatId && stat.level === 1,
    );
    if (
      !stat ||
      !isFormalHeroName(stat.name) ||
      !Number.isSafeInteger(stat.life) ||
      stat.life < 1 ||
      (stat.attributesVerified !== true && !isFormalHeroRosterPendingAttributes(stat.name))
    )
      throw new Error("需要正式目录I级英雄（已核实属性或已登记的建队占位）");
    selectedNames.push(stat.name);
    if (
      selected.skillIds.length !== 3 ||
      new Set(selected.skillIds).size !== 3 ||
      selected.skillIds.some((id) => {
        const skill = sources.catalog.skills.find((entry) => entry.id === id);
        return !skill || !embarkSkillAllowed(stat.name, skill);
      })
    )
      throw new Error("每名英雄须装备三个不同的可用I级技能（已核实）");
    return {
      id: `hero-${index}`,
      heroStatId: stat.id,
      level: 1,
      life: stat.life,
      attributesVerified: stat.attributesVerified === true,
      wounds: 0,
      stress: 0,
      stance: selected.stance,
      skillIds: [...selected.skillIds],
    };
  });
  if (
    new Set(selectedNames).size !== 4 ||
    !sources.catalog.conditions ||
    !sources.catalog.trinkets ||
    sources.catalog.trinkets.level !== 1 ||
    sources.resolveCards.length !== 10 ||
    new Set(sources.resolveCards.map((card) => card.id)).size !== 10
  )
    throw new Error("需要四名不同正式目录英雄及完整条件、I级饰品与十张意志卡");
  const conditions = createConditionPool(
    sources.catalog.conditions.diseases,
    sources.catalog.conditions.quirks,
  );
  const trinkets = {
    ...sources.catalog.trinkets,
    deck: null,
    discard: [],
    held: [],
    incoming: null,
  };
  const problem = trinketPoolProblem(trinkets, heroes);
  if (problem) throw new Error(problem);
  const wealdSandbox = quest?.expeditionRegion === "weald";
  if (wealdSandbox && (!contentPacks?.includes("weald") || !sources.weald))
    throw new Error("Weald 沙盒出征需要已选内容包与完整核准来源");
  const decks = wealdSandbox
    ? rebuildLocationQuestDecks(
        sources,
        "weald",
        quest.level,
        contentPacks,
        advanced ? "weald-tasks-v1" : whispering ? "weald-higher-v1" : undefined,
      )
    : rebuildCoreQuestDecks(sources);
  const draw = initialQuestDrawMode
    ? drawInitialQuestOffers(seed, contentPacks, initialQuestDrawMode)
    : undefined;
  if (draw && !draw.offers.includes(questId)) throw new Error("所选任务不在首趟抽出的两张候选中");
  const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), seed, draw?.cursor ?? 0);
  const initial = createDungeonSandbox(
    seed,
    layout,
    quest.distribution,
    mode,
    "S",
    heroes,
    sources.resolveCards,
    {
      dungeonLevel: questId === FACE_THE_THREAT_QUEST_ID ? 1 : quest!.level,
      light: 5,
      provisions: [],
    },
    decks.curios,
    wealdSandbox ? WEALD_APPROVED_ROOM_CARDS : sources.rooms,
    decks.monsterPool.cards,
    {
      ...decks.catalog,
      ...(wealdSandbox
        ? {
            monsters: [
              ...sources.catalog.monsters.filter((m) => !m.id.includes(":weald:")),
              ...decks.catalog.monsters.filter((m) => m.id.includes(":weald:")),
            ],
          }
        : {}),
      conditions,
      trinkets,
    },
    true,
    draw?.cursor ?? 0,
  );
  let game: GameState = { ...initial, skillLightBeforeCrit: true };
  if (wealdHigherQuestOffers && game.dungeon)
    game = { ...game, dungeon: { ...game.dungeon, wealdHigherQuestOffers } };
  if (advanced && game.dungeon)
    game = { ...game, dungeon: { ...game.dungeon, campaignLevel: quest.level } };
  if (whispering && game.dungeon)
    game = { ...game, dungeon: { ...game.dungeon, whisperingWoodsQuest: true, campaignLevel: 3 } };
  if (draw && game.dungeon)
    game = {
      ...game,
      dungeon: {
        ...game.dungeon,
        initialQuestDrawMode,
        discardedQuests: draw.offers.filter((id) => id !== questId),
      },
    };
  if (wealdSandbox && game.dungeon) {
    const drawScope = quest && "monsterDrawScope" in quest ? quest.monsterDrawScope : undefined;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon,
        monsterPool: {
          ...decks.monsterPool,
          ...(drawScope ? { monsterDrawScope: drawScope } : {}),
        },
      },
    };
  }
  if (contentPacks && game.dungeon) game = { ...game, dungeon: { ...game.dungeon, contentPacks } };
  if (questId === "quest:weald:p002" && game.dungeon)
    game = {
      ...game,
      dungeon: {
        ...game.dungeon,
        questExceptionCroneKills: 0,
        questExceptionComponentAvailable: true,
      },
    };
  if (questId === "quest:weald:p003" && game.dungeon)
    game = { ...game, dungeon: { ...game.dungeon, disinfectionOakCount: 0 } };
  if (mode === "stygian" && stygianRoomRules && game.dungeon)
    game = { ...game, dungeon: { ...game.dungeon, stygianRoomRules } };
  if (isDarkestQuest(questId)) return setupDarkestDungeon(game);
  if (questId !== FACE_THE_THREAT_QUEST_ID) return game;
  const dungeon = game.dungeon;
  if (!dungeon) throw new Error("沙盒 p019 缺地牢状态");
  const plan = requireFaceTheThreatEmbarkPlanForSandbox(
    dungeon.activeBossThreatScriptId
      ? { campaignLevel: 1, activeBossThreatScriptId: dungeon.activeBossThreatScriptId }
      : { campaignLevel: 1 },
  );
  const placed = bossEdgeRooms
    ? placeFaceTheThreatRooms(
        layout,
        dungeon.questDistribution!.counts.flatMap((c) =>
          Array.from({ length: c.count }, () => c.kind),
        ),
        seed,
        0,
      )
    : null;
  return {
    ...game,
    dungeon: {
      ...dungeon,
      campaignLevel: 1 as const,
      ...(placed
        ? {
            cursor: placed.cursor,
            rooms: dungeon.rooms.map((r, i) => ({ ...r, kind: placed.tokens[i]! })),
          }
        : {}),
      faceTheThreatEmbarkPlan: bossEdgeRooms
        ? {
            ...plan,
            roomPlacement: "edgeRoomsR30" as const,
            layoutWiringHold: "R30 边缘房代币已布置；Boss 专属战斗房间由各 Boss deploy* 绑定",
          }
        : plan,
    },
  };
}
