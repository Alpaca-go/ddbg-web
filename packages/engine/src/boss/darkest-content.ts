import source from "../../../data/normalized/corebox/darkest_boss_content.json";
import {
  darkestBossContentSchema,
  finalBattlePlanForQuest,
} from "../../../data/src/darkest-boss-content";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";

const content = darkestBossContentSchema.parse(source);

export function readDarkestBossEncounter(questId: string | undefined) {
  const encounter = content.encounters.find((e) => e.questId === questId);
  return encounter ? structuredClone(encounter) : undefined;
}

/** R35/R39–40：普通守卫战不算Boss胜利；Templars必须两只均已击败。 */
export function darkestBossVictoryAfterEncounter(state: GameState): boolean {
  const d = state.dungeon,
    b = state.battle;
  const encounter = content.encounters.find((e) => e.questId === d?.questDistribution?.questId);
  const turn = b?.encounter?.turn;
  if (!d?.darkest || !encounter || !b || turn?.type !== "finished" || turn.outcome !== "victory")
    return false;
  return encounter.actors.every((a) => {
    const entities = b.entities.filter((e) => e.side === "monster" && e.monsterCardId === a.cardId);
    return entities.length > 0 && entities.every((e) => e.dead);
  });
}

/** 只生成准备计划；不跳过回村、发XP或替玩家启动未接入的最终战。 */
export function readFinalBattlePlanAfterDarkestVictory(d: DungeonState) {
  if (
    d.phase !== "inHamlet" ||
    !d.darkest ||
    !d.bossQuestVictory ||
    !d.questSummary?.awarded ||
    d.hamletReturn?.phase !== "complete" ||
    d.questSummary.questId !== d.questDistribution?.questId
  )
    return undefined;
  if (!content.encounters.some((e) => e.questId === d.questSummary!.questId)) return undefined;
  return finalBattlePlanForQuest(content, d.questSummary.questId);
}
