import trinketFile from "../../data/normalized/corebox/trinket.json";
import { basicQuests, questsForCampaignLevel } from "../../data/src/basic-quests";
import type { CampaignLevel } from "../../data/src/basic-quests";
import { monsterPoolCatalogSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { createRng } from "./rng";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { conditionPoolProblem } from "./conditions";
import { switchTrinketDungeonLevel, trinketPoolProblem } from "./trinket-acquisition";

const allTrinketCards = normalizedTrinketFileSchema.parse(trinketFile).cards;

export function readCampaignLevel(d: { readonly campaignLevel?: CampaignLevel }): CampaignLevel {
  return d.campaignLevel ?? 1;
}

/** I→II开发预览；不代表已击败Boss，不进入正式存档。正式升幕仍待R35完整前置。 */
export function advanceCampaignLevel(state: GameState): ApplyResult {
  const d = state.dungeon;
  const h = d?.hamlet;
  const level = d ? readCampaignLevel(d) : 1;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    !d.questSummary?.awarded ||
    h?.phase !== "preparationComplete" ||
    h.active ||
    d.pending ||
    level !== 1 ||
    !d.conditions ||
    !d.trinkets ||
    !d.monsterPool ||
    !monsterPoolCatalogSchema.safeParse(d.monsterPool.cards).success ||
    d.monsterPool.active ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0
  )
    return rejectBattleCommand(
      state,
      "须在村庄准备完成后、无待选时推进战役等级 I→II（§2.2 / R35）；本切片不含 Boss 战",
    );
  const buildings = buildingLevelsProblem(d);
  if (buildings) return rejectBattleCommand(state, buildings);
  const conditions = conditionPoolProblem(d.conditions, d.heroes);
  if (conditions) return rejectBattleCommand(state, conditions);
  const originalTrinketIssue = trinketPoolProblem(d.trinkets, d.heroes);
  if (originalTrinketIssue) return rejectBattleCommand(state, originalTrinketIssue);

  const switched = switchTrinketDungeonLevel(d.trinkets, allTrinketCards, 2);
  if ("reason" in switched) return rejectBattleCommand(state, switched.reason);
  const trinketIssue = trinketPoolProblem(switched, d.heroes);
  if (trinketIssue) return rejectBattleCommand(state, trinketIssue);

  const discarded = [...(d.discardedQuests ?? [])];
  if (
    discarded.some((id) => typeof id !== "string" || !id) ||
    new Set(discarded).size !== discarded.length
  )
    return rejectBattleCommand(state, "任务弃置记录无效，未推进战役等级（R-037）");
  for (const quest of questsForCampaignLevel(1)) {
    if (!discarded.includes(quest.id)) discarded.push(quest.id);
  }
  const current = d.questSummary.questId;
  if (basicQuests.some((q) => q.id === current && q.level === 1) && !discarded.includes(current))
    discarded.push(current);

  const level1 = ruinsMonsterPool(d.monsterPool.cards, 1).map((m) => m.instanceId);
  const level2 = ruinsMonsterPool(d.monsterPool.cards, 2).map((m) => m.instanceId);
  const original = [...(d.monsterPool.remaining ?? level1), ...d.monsterPool.discarded];
  const present = new Set(original);
  if (present.size !== original.length || original.some((id) => !level1.includes(id)))
    return rejectBattleCommand(state, "怪物牌堆重复或含非I级实例，未推进战役等级");
  const deck = [...level1.filter((id) => present.has(id)), ...level2];
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  let cursor = d.cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    cursor++;
  }

  const { nextQuestOffers: _offers, ...dungeonBase } = d;
  void _offers;
  return {
    state: {
      ...state,
      dungeon: {
        ...dungeonBase,
        campaignLevel: 2,
        cursor,
        discardedQuests: discarded,
        trinkets: switched,
        monsterPool: {
          ...d.monsterPool,
          remaining: deck,
          discarded: [],
          active: null,
        },
        ...(d.explorationSetup
          ? { explorationSetup: { ...d.explorationSetup, dungeonLevel: 2 as const } }
          : {}),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message:
          "沙盒预览 I→II：旧级任务堆移出，加入 II 级怪物，地牢饰品改为 II 级，已装备 I 级饰品保留。不代表击败Boss或完成正式升幕；未抽新迫近威胁，不支持正式存档。",
      },
    ],
  };
}
