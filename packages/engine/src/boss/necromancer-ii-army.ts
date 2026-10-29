import type { DungeonState } from "../dungeon";
import type { SpawnCard } from "../spawn";
import { readActiveBossThreatScript } from "./threat-passive-runtime";
import { runBossHook } from "./hooks";

function firstBattleMonster(d: DungeonState): string | undefined {
  if (d.necromancerIIArmyUsed) return undefined;
  const script = readActiveBossThreatScript(d);
  if (!script) return undefined;
  const effect = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  return effect.status === "ok" && effect.effect === "firstBattleBoneCaptain"
    ? effect.monsterCardId
    : undefined;
}

/** p005 / R16–17：指定怪物先生成，再沿原牌序填满四姿态；不复制卡、不额外掷骰。 */
export function firstBattleThreatDeck(
  d: DungeonState,
  deck: readonly SpawnCard[],
):
  | { status: "ok"; deck: readonly SpawnCard[]; forced: boolean }
  | { status: "refused"; reason: string } {
  const cardId = firstBattleMonster(d);
  if (!cardId) return { status: "ok", deck, forced: false };
  const matches = deck.filter((card) => card.cardId === cardId);
  if (matches.length !== 1)
    return {
      status: "refused",
      reason: "Army of the Dead 缺唯一 Bone Captain 真实牌池实例，未部署（R-048）",
    };
  return {
    status: "ok",
    deck: [matches[0]!, ...deck.filter((card) => card !== matches[0])],
    forced: true,
  };
}

/** 只在实际进入首场战斗成功后消费，部署失败 / 缺字段重试均不消费。 */
export function firstBattleThreatEntry(
  d: DungeonState,
): { status: "ok"; dungeon: DungeonState } | { status: "refused"; reason: string } {
  const cardId = firstBattleMonster(d);
  if (!cardId) return { status: "ok", dungeon: d };
  const first = d.monsterPool?.active?.monsters[0];
  if (!first || first.cardId !== cardId || first.stance !== "aggressive" || first.stanceSlots !== 2)
    return {
      status: "refused",
      reason: "Army of the Dead 首场未先生成 Bone Captain，保持部署（R-048）",
    };
  return { status: "ok", dungeon: { ...d, necromancerIIArmyUsed: true } };
}
