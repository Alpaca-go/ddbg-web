import type { MonsterPoolCard } from "../../data/src/monster-pool";
import type { DungeonState } from "./dungeon";
import type { SpawnCard } from "./spawn";

/** The Threat is Real III（quest_cards.json quest:p015 SPECIAL）。 */
export const THREAT_IS_REAL_III_QUEST_ID = "quest:p015" as const;

/** 池卡 instanceId → 规范化 level（R17 页码映射，不按名字猜）。 */
export function readMonsterPoolInstanceLevel(
  poolCards: readonly MonsterPoolCard[],
  instanceId: string,
): number | undefined {
  const match = /^monster-deck:p(\d+)$/.exec(instanceId);
  if (!match) return undefined;
  const page = Number(match[1]);
  return poolCards.find((entry) => entry.pages.includes(page))?.level;
}

export function threatIsRealNoL1LairSpecialActive(
  d: DungeonState,
  room: Pick<DungeonState["rooms"][number], "kind"> | undefined,
): boolean {
  return d.questDistribution?.questId === THREAT_IS_REAL_III_QUEST_ID && room?.kind === "lair";
}

/** Lair + quest:p015：跳过 Level 1 池实例，不生成；其余房间 / 任务返回 undefined。 */
export function threatIsRealNoL1LairSkipSpawn(
  d: DungeonState,
  room: Pick<DungeonState["rooms"][number], "kind"> | undefined,
  poolCards: readonly MonsterPoolCard[],
): ((card: SpawnCard) => boolean) | undefined {
  if (!threatIsRealNoL1LairSpecialActive(d, room)) return undefined;
  return (card) => readMonsterPoolInstanceLevel(poolCards, card.instanceId) === 1;
}
