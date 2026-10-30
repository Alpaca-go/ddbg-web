import { healingTrinketReaction } from "./trinket-reactions";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal, passiveStress } from "./passive";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

/** Town Fair p7、R27/R29/R32：全体压力-3并治疗2×HL；全部校验成功才提交/洗回。 */
export function applyTownFair(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p007" ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((hero) => hero.id)).size !== 4 ||
    !d.conditions ||
    d.conditions.incomingQuirk ||
    conditionPoolProblem(d.conditions, d.heroes) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(state, "Town Fair须在完整回村和有效英雄/事件牌池下结算（R32）");
  const heroes: DungeonState["heroes"][number][] = [];
  for (const hero of d.heroes) {
    const stat = d.battleCatalog?.heroStats.find((card) => card.id === hero.heroStatId);
    if (
      hero.dead ||
      !hero.attributesVerified ||
      !stat?.attributesVerified ||
      ![1, 2, 3].includes(hero.level!) ||
      stat.level !== hero.level ||
      (hero.heroLevel !== undefined && hero.heroLevel !== hero.level) ||
      hero.life === undefined ||
      hero.wounds === undefined ||
      !Number.isSafeInteger(hero.stress) ||
      hero.stress < 0 ||
      hero.stress > 9
    )
      return rejectBattleCommand(
        state,
        "Town Fair缺少获批英雄等级/Life，或生命/压力状态无效（R-048）",
      );
    const health = resolveHeroHealth(
      { life: hero.life, wounds: hero.wounds, dead: false },
      {
        type: "heal",
        amount: passiveHeal(hero, healingTrinketReaction(d, undefined, hero.id, 2 * hero.level!)),
      },
    );
    if (health.status !== "resolved")
      return rejectBattleCommand(
        state,
        health.status === "refused" ? health.reason : "事件治疗不应请求死门骰（R29）",
      );
    const stress = Math.max(0, hero.stress + passiveStress(hero, -3, 5).amount);
    heroes.push({
      ...hero,
      wounds: health.state.wounds,
      stress,
      ...(hero.combat ? { combat: { ...hero.combat, wounds: health.state.wounds, stress } } : {}),
    });
  }
  const completed = completeHamletEvent({ ...state, dungeon: { ...d, heroes } });
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message:
          "Town Fair：全体压力−3，治疗2×英雄等级，已应用Resilient/Infirm/Fast Healer修正（卡面p7、R27/R29）",
      },
      ...completed.events,
    ],
  };
}
