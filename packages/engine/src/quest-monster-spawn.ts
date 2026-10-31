import questCards from "../../data/normalized/corebox/quest_cards.json";
import { readBasicQuest } from "../../data/src/basic-quests";
import type { MonsterPoolCard } from "../../data/src/monster-pool";
import { ruinsMonsterPool } from "../../data/src/monster-pool";
import { questCardsSchema } from "../../data/src/quest-cards";
import type { QuestMonsterPlan } from "../../data/src/quest-monster-plan";
import { readQuestMonsterPlan } from "../../data/src/quest-monster-plan";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import type { SkillStance } from "./hero-skill";
import { spawnMonsters, type SpawnCard } from "./spawn";

const cards = questCardsSchema.parse(questCards);

export function readQuestMonsterPlanAtRoom(d: DungeonState): QuestMonsterPlan | undefined {
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "objective") return undefined;
  const quest = readBasicQuest(d.questDistribution);
  if (!quest) return undefined;
  return readQuestMonsterPlan(cards, quest.id);
}

function findQuestMonsterPoolCard(
  catalog: readonly MonsterPoolCard[],
  plan: QuestMonsterPlan,
): MonsterPoolCard | undefined {
  const matches = catalog.filter(
    (entry) =>
      entry.name === plan.monsterName &&
      (plan.printedMonsterLevel === null || entry.level === plan.printedMonsterLevel),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function questMonsterSpawnCard(
  poolCards: readonly MonsterPoolCard[],
  plan: QuestMonsterPlan,
  dungeonLevel: number,
  remaining: readonly string[] | null,
): SpawnCard | undefined {
  const poolCard = findQuestMonsterPoolCard(poolCards, plan);
  if (!poolCard) return undefined;
  const through = dungeonMonsterPoolThrough({ cards: poolCards }, dungeonLevel);
  let candidates = through.filter((entry) => entry.cardId === poolCard.combatCardId);
  if (!candidates.length && plan.printedMonsterLevel !== null)
    candidates = ruinsMonsterPool(poolCards, plan.printedMonsterLevel).filter(
      (entry) => entry.cardId === poolCard.combatCardId,
    );
  if (!candidates.length) return undefined;
  const order = remaining ?? through.map((entry) => entry.instanceId);
  const picked = order.find((id) => candidates.some((entry) => entry.instanceId === id));
  return candidates.find((entry) => entry.instanceId === picked) ?? candidates[0];
}

/** 任务指定实例不在当前 DL 牌堆内时，仅出现在 active，不计入 remaining。 */
export function questMonsterOutsidePoolInstanceIds(d: DungeonState): readonly string[] {
  const plan = readQuestMonsterPlanAtRoom(d);
  const active = d.monsterPool?.active;
  if (!plan || !active || active.roomId !== d.position) return [];
  const level = d.explorationSetup?.dungeonLevel;
  const pool = d.monsterPool;
  if (!level || !pool || ![1, 2, 3].includes(level)) return [];
  const catalog = dungeonMonsterPoolThrough(pool, level);
  const catalogIds = new Set(catalog.map((entry) => entry.instanceId));
  return active.monsters.map((m) => m.instanceId).filter((id) => !catalogIds.has(id));
}

export function questMonsterDeploymentMatchesPlan(
  d: DungeonState,
  plan: QuestMonsterPlan,
): boolean {
  const active = d.monsterPool?.active;
  if (!active || active.roomId !== d.position || active.monsters.length !== 1) return false;
  const poolCard = findQuestMonsterPoolCard(d.monsterPool!.cards, plan);
  if (!poolCard) return false;
  const spawn = active.monsters[0]!;
  return (
    spawn.cardId === poolCard.combatCardId &&
    spawn.stanceSlots === poolCard.stanceSlots &&
    spawn.edge === poolCard.edge
  );
}

/** QUEST p9/p13：按计划生成指定怪物；不洗牌、不填满四姿态、不推断额外生成（R-048）。 */
export function prepareQuestMonsterDeployment(
  state: GameState,
  deployment: Readonly<Record<SkillStance, string>>,
): ApplyResult | undefined {
  const d = state.dungeon!;
  const plan = readQuestMonsterPlanAtRoom(d);
  if (!plan || plan.combatReady) return undefined;
  const pool = d.monsterPool!;
  const dungeonLevel = d.explorationSetup!.dungeonLevel;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (pool.active || pool.discarded.length)
    return refuse("本场怪物已记录或牌堆状态不一致；不能重抽 / 重洗 / 发奖励");
  const poolCard = findQuestMonsterPoolCard(pool.cards, plan);
  if (!poolCard)
    return refuse(
      `${plan.monsterName} 缺少唯一牌池目录条目，不能伪造任务指定生成（QUEST p${plan.source.page}、R-048）`,
    );
  const catalog = dungeonMonsterPoolThrough(pool, dungeonLevel);
  const spawnCard = questMonsterSpawnCard(pool.cards, plan, dungeonLevel, pool.remaining);
  if (!spawnCard)
    return refuse(
      `${plan.monsterName} 缺少真实牌池实例，不能伪造任务指定生成（QUEST p${plan.source.page}、R-048）`,
    );
  const spawned = spawnMonsters([spawnCard], deployment);
  if (spawned.type === "refused") return refuse(spawned.reason);
  const catalogIds = new Set(catalog.map((entry) => entry.instanceId));
  const outsidePool = !catalogIds.has(spawnCard.instanceId);
  const baseRemaining = pool.remaining ?? catalog.map((entry) => entry.instanceId);
  const remaining = outsidePool
    ? baseRemaining
    : baseRemaining.filter((id) => id !== spawnCard.instanceId);
  if (
    (!outsidePool && remaining.some((id) => id === spawnCard.instanceId)) ||
    new Set(remaining).size !== remaining.length ||
    remaining.some((id) => !catalog.some((entry) => entry.instanceId === id))
  )
    return refuse("怪物牌堆不守恒，不能推进任务指定生成");
  const missing = poolCard.missingBattleFields.length
    ? `待核实战斗字段：${poolCard.missingBattleFields
        .map((field) => ({ speed: "移动值", stanceGroups: "姿态选招", unverifiedIcons: "未确认图标" })[field])
        .join(" / ")}。`
    : "";
  const bonus =
    plan.lifeBonus || plan.dodgeBonus
      ? `任务加成 Life +${plan.lifeBonus}、Dodge +${plan.dodgeBonus}；`
      : "";
  const level =
    plan.printedMonsterLevel === null ? "" : ` ${plan.printedMonsterLevel} 级`;
  const blockedReason = `${bonus}${missing}任务指定已部署${level} ${plan.monsterName}；combatReady 仍为 false，不能进入半场战斗。不洗牌、不填满四姿态、不推断额外生成（QUEST p${plan.source.page}、R-048）。`;
  const active = d.roomCards!.active!;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        monsterPool: {
          ...pool,
          remaining,
          discarded: pool.discarded,
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `任务指定生成${level} ${plan.monsterName}（QUEST p${plan.source.page}）：${blockedReason}`,
      },
    ],
  };
}

export function readQuestMonsterStatBonuses(
  d: DungeonState,
  spawnCardId: string,
): { lifeBonus: number; dodgeBonus: number } | undefined {
  const plan = readQuestMonsterPlanAtRoom(d);
  if (!plan || !questMonsterDeploymentMatchesPlan(d, plan)) return undefined;
  const poolCard = findQuestMonsterPoolCard(d.monsterPool!.cards, plan);
  if (!poolCard || poolCard.combatCardId !== spawnCardId) return undefined;
  return { lifeBonus: plan.lifeBonus, dodgeBonus: plan.dodgeBonus };
}
