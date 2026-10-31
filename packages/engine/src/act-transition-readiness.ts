import { bossFlatQuestSummarySchema } from "../../data/src/quest-summary";
import { buildRuinsActTransitionPlan } from "./act-transition-plan";
import type { GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { RUINS_COMBAT_LEVELS } from "./boss/ruins-combat-levels";
import { countCompletedRegularQuestsAtCampaignLevel } from "./boss/face-the-threat-embark-runtime";

/** 当前p019结算是否仍待I→II/II→III升幕；成功命令会清除旧出征绑定。 */
export function requiresRuinsActAdvance(d: DungeonState): boolean {
  const level = d.campaignLevel ?? 1;
  if (
    d.questSummary?.questId !== "quest:p019" ||
    !d.bossQuestVictory ||
    (level !== 1 && level !== 2)
  )
    return false;
  if (level === 1) return true;
  const defeated = d.defeatedRuinsBossIdentities ?? [];
  const advanced =
    defeated.length === 1 &&
    !d.faceTheThreatEmbarkPlan &&
    !d.bossCombatThreatCeased &&
    Object.entries(RUINS_COMBAT_LEVELS).some(
      ([boss, entries]) =>
        boss !== defeated[0] &&
        entries[1].script === d.activeBossThreatScriptId &&
        entries[1].description === d.imminentThreatDescriptionCardId,
    );
  return !advanced;
}

export type RuinsActTransitionReadiness =
  | { readonly kind: "blocked"; readonly reason: string }
  | { readonly kind: "ready"; readonly plan: ReturnType<typeof buildRuinsActTransitionPlan> };

/** §2.2/R35：读取现有胜利与回村记录，不生成胜利证明，不改状态或消费RNG。 */
export function readRuinsActTransitionReadiness(state: GameState): RuinsActTransitionReadiness {
  const blocked = (reason: string): RuinsActTransitionReadiness => ({ kind: "blocked", reason });
  const d = state.dungeon;
  if (!d || state.battle || d.darkest || d.phase !== "inHamlet")
    return blocked("须在遗迹Boss任务结束并回村后读取升幕计划（R35）");
  const level = d.campaignLevel ?? 1;
  if (level !== 1 && level !== 2)
    return blocked("本接口只处理I→II和II→III；III幕后最暗地牢另行处理");
  if (d.questDistribution?.questId !== "quest:p019" || !d.bossQuestVictory)
    return blocked("只有已击败Boss的Face the Threat任务能推进遗迹幕次");
  const summary = bossFlatQuestSummarySchema.safeParse(d.questSummary);
  if (
    !summary.success ||
    summary.data.questId !== "quest:p019" ||
    !summary.data.awarded ||
    d.hamletReturn?.phase !== "complete"
  )
    return blocked("Boss任务须已结算3 XP并完成回村流程（R-122）");
  if (
    d.pending ||
    d.hamlet?.active ||
    d.monsterPool?.active ||
    d.roomCards?.active ||
    d.curio?.active ||
    d.trinkets?.incoming
  )
    return blocked("须先完成当前待选、战斗回收或奖励处理");
  if (d.activeBossThreatScriptId) return blocked("已击败Boss的迫近威胁须先清除");
  if (countCompletedRegularQuestsAtCampaignLevel(d, level) !== 2)
    return blocked("本幕须已完成两个普通任务再击败Boss（§2.1）");
  const defeated = d.defeatedRuinsBossIdentities ?? [];
  const latest = defeated.at(-1);
  const entry =
    latest && Object.hasOwn(RUINS_COMBAT_LEVELS, latest)
      ? RUINS_COMBAT_LEVELS[latest][level - 1]
      : undefined;
  const embark = d.faceTheThreatEmbarkPlan;
  if (
    !entry ||
    !embark ||
    embark.questId !== "quest:p019" ||
    embark.resolvedScriptId !== entry.script ||
    embark.combatEntry.combatMonsterCardId !== entry.card ||
    embark.combatEntry.combatAbilityCardId !== entry.ability ||
    embark.combatEntry.descriptionAbilityCardId !== entry.description ||
    d.bossCombatThreatCeased !== entry.script ||
    d.imminentThreatDescriptionCardId !== entry.description
  )
    return blocked("最近击败Boss须与当前等级的出征、停止威胁面及描述卡身份一致");
  try {
    return {
      kind: "ready",
      plan: buildRuinsActTransitionPlan(level, defeated, d.discardedQuests ?? []),
    };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : "升幕记录无效");
  }
}
