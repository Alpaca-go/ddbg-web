import { bossFlatQuestSummarySchema } from "../../data/src/quest-summary";
import { buildRuinsActTransitionPlan, buildWealdActTransitionPlan } from "./act-transition-plan";
import type { GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { RUINS_COMBAT_LEVELS } from "./boss/ruins-combat-levels";
import { RUINS_BOSS_IDENTITIES } from "./boss/threat-description-catalog";
import { countCompletedRegularQuestsAtCampaignLevel } from "./boss/face-the-threat-embark-runtime";
import { WEALD_HIGHER_BOSS_ENTRIES } from "./weald/bosses/higher-boss-entries";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "./weald/catalog";
import {
  allDefeatedBossIdentityKeys,
  bossActEntryFromCeasedScript,
  readCampaignBossDefeatCounts,
} from "./campaign-boss-defeats";

export function wealdLocationActAdvanceEnabled(
  d: Pick<DungeonState, "locationBossThreats" | "wealdHigherBosses" | "bossLocationSources">,
): boolean {
  return (
    d.locationBossThreats === true && d.wealdHigherBosses === true && d.bossLocationSources === true
  );
}

function wealdBossIdentityFromScript(script: string): WealdBossIdentity | undefined {
  const match = /^boss:weald:(hag|brigandPounder|shrieker):[123]$/.exec(script);
  return match?.[1] as WealdBossIdentity | undefined;
}

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
  const weald = wealdLocationActAdvanceEnabled(d);
  const { ruins, weald: wealdDefeated, total } = readCampaignBossDefeatCounts(d);
  const defeatedIds = allDefeatedBossIdentityKeys(ruins, wealdDefeated);
  const advanced =
    total === 1 &&
    !d.faceTheThreatEmbarkPlan &&
    !d.bossCombatThreatCeased &&
    (weald
      ? WEALD_HIGHER_BOSS_ENTRIES.some((row) => {
          const identity = wealdBossIdentityFromScript(row.scriptId);
          return (
            row.scriptId.endsWith(`:${level}`) &&
            identity !== undefined &&
            !defeatedIds.has(identity) &&
            row.scriptId === d.activeBossThreatScriptId &&
            row.descriptionAbilityCardId === d.imminentThreatDescriptionCardId
          );
        }) ||
        Object.entries(RUINS_COMBAT_LEVELS).some(
          ([boss, entries]) =>
            !defeatedIds.has(boss) &&
            entries[1].script === d.activeBossThreatScriptId &&
            entries[1].description === d.imminentThreatDescriptionCardId,
        )
      : Object.entries(RUINS_COMBAT_LEVELS).some(
          ([boss, entries]) =>
            !defeatedIds.has(boss) &&
            entries[1].script === d.activeBossThreatScriptId &&
            entries[1].description === d.imminentThreatDescriptionCardId,
        ));
  return !advanced;
}

export type RuinsActTransitionReadiness =
  | { readonly kind: "blocked"; readonly reason: string }
  | {
      readonly kind: "ready";
      readonly plan: ReturnType<typeof buildRuinsActTransitionPlan>;
      readonly location: "ruins" | "weald";
    };

function readWealdActTransitionReadiness(state: GameState): RuinsActTransitionReadiness {
  const blocked = (reason: string): RuinsActTransitionReadiness => ({ kind: "blocked", reason });
  const d = state.dungeon!;
  if (d.wealdHigherQuestOffers === true)
    return blocked("已弃用的 wealdHigherQuestOffers:true 不能接通 II 级生产池（R-264）");
  const level = d.campaignLevel ?? 1;
  if (level === 2 && d.wealdHigherQuestOffers !== "tasks-v1")
    return blocked("Weald II 级升幕须 production tasks-v1 普通任务版本（R-264／R-265）");
  const { ruins, weald: wealdDefeated, total } = readCampaignBossDefeatCounts(d);
  if (total !== level)
    return blocked(
      `本幕须已击败 ${level} 个战役 Boss（遗迹与 Weald 合计）；当前合计 ${total}（§2.2／W3）`,
    );
  if (
    new Set(ruins).size !== ruins.length ||
    ruins.some((id) => !RUINS_BOSS_IDENTITIES.includes(id)) ||
    new Set(wealdDefeated).size !== wealdDefeated.length ||
    wealdDefeated.some((id) => !WEALD_BOSS_IDENTITIES.includes(id))
  )
    return blocked("战役 Boss 击败记录重复或身份无效");
  const ceased = d.bossCombatThreatCeased;
  const entry = ceased ? bossActEntryFromCeasedScript(ceased, level) : undefined;
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
    return blocked("最近击败 Boss 须与当前等级的出征、停止威胁面及描述卡身份一致");
  try {
    return {
      kind: "ready",
      location: "weald",
      plan: buildWealdActTransitionPlan(
        level as 1 | 2,
        ruins,
        wealdDefeated,
        d.discardedQuests ?? [],
      ),
    };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : "升幕记录无效");
  }
}

/** §2.2/R35：读取现有胜利与回村记录，不生成胜利证明，不改状态或消费RNG。 */
export function readRuinsActTransitionReadiness(state: GameState): RuinsActTransitionReadiness {
  const blocked = (reason: string): RuinsActTransitionReadiness => ({ kind: "blocked", reason });
  const d = state.dungeon;
  if (!d || state.battle || d.darkest || d.phase !== "inHamlet")
    return blocked("须在 Boss 任务结束并回村后读取升幕计划（R35）");
  const level = d.campaignLevel ?? 1;
  if (level !== 1 && level !== 2)
    return blocked("本接口只处理I→II和II→III；III幕后最暗地牢另行处理");
  if (d.questDistribution?.questId !== "quest:p019" || !d.bossQuestVictory)
    return blocked("只有已击败 Boss 的 Face the Threat 任务能推进战役幕次");
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
  if (wealdLocationActAdvanceEnabled(d)) return readWealdActTransitionReadiness(state);
  if (d.locationBossThreats && !d.wealdHigherBosses)
    return blocked("Weald II／III 级 Boss 描述来源及升幕尚未核准接通（W3／R-048）");
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
      location: "ruins",
      plan: buildRuinsActTransitionPlan(level, defeated, d.discardedQuests ?? []),
    };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : "升幕记录无效");
  }
}
