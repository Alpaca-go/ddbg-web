import trinketFile from "../../data/normalized/corebox/trinket.json";
import { basicQuests, questsForCampaignLevel } from "../../data/src/basic-quests";
import type { CampaignLevel } from "../../data/src/basic-quests";
import { ruinsMonsterPool } from "../../data/src/monster-pool";
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

/** R35 / R-037：击败 Boss 后推进战役等级；本切片只接 I→II，不含新威胁抽取与 Boss 战。 */
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
    !d.monsterPool.cards ||
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
  const present = new Set([
    ...(d.monsterPool.remaining ?? level1),
    ...d.monsterPool.discarded,
  ]);
  if ([...present].some((id) => !level1.includes(id) && !level2.includes(id)))
    return rejectBattleCommand(state, "怪物牌堆含未知实例，未推进战役等级");
  const deck = [...level1.filter((id) => present.has(id)), ...level2];
  if (deck.length !== level1.filter((id) => present.has(id)).length + level2.length)
    return rejectBattleCommand(state, "累加怪物牌堆数量无效，未推进战役等级（R-037）");
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  let cursor = d.cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    cursor++;
  }

  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        campaignLevel: 2,
        cursor,
        discardedQuests: discarded,
        nextQuestOffers: undefined,
        trinkets: switched,
        monsterPool: {
          ...d.monsterPool,
          remaining: deck,
          discarded: [],
          active: null,
        },
        explorationSetup: d.explorationSetup
          ? { ...d.explorationSetup, dungeonLevel: 2 }
          : undefined,
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message:
          "战役等级 I→II：旧级任务堆移出，加入 II 级怪物，地牢饰品改为 II 级；已装备 I 级饰品保留（§2.2 / R35 / R-037）。本切片未抽新迫近威胁。",
      },
    ],
  };
}
