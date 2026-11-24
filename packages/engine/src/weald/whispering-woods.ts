import type { ApplyResult, Command, GameState } from "../shared/core/command";
import { rejectBattleCommand } from "../shared/battle/battle";
import { triggerBattlePassive } from "../shared/battle/battle-passive";
import { pressureCasualties, resolveBattlePressure } from "../shared/core/pressure";
import { endAfterCasualties, removeCasualties } from "../shared/dungeon/encounter";

function active(state: GameState): boolean {
  const d = state.dungeon;
  return (
    d?.contentPacks?.includes("weald") === true &&
    d.questDistribution?.questId === "quest:weald:p015" &&
    d.monsterPool?.location === "weald" &&
    d.monsterPool.wealdSourceVersion === "higher-v1" &&
    d.monsterPool.wealdMonsterLevel === 3 &&
    state.battle?.wealdMechanics === true
  );
}

/** R-264／任务 FRONT p15：每轮一次，首轮也触发；旧无标记日志不升级。 */
export function applyWhisperingWoodsRoundStart(
  original: GameState,
  command: Command,
  result: ApplyResult,
): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  const enable =
    command.type === "startBattle" &&
    (command.wealdWhisperingWoods === true || result.state.dungeon?.whisperingWoodsQuest === true);
  if (!enable && result.state.battle?.whisperingWoodsRound === undefined) return result;
  if (!active(result.state))
    return rejectBattleCommand(
      original,
      "Whispering Woods 需要 Weald III 级显式来源与 p015 任务（R-264）",
    );
  const battle = result.state.battle!;
  const round = battle.encounter?.round;
  if (
    !round ||
    !result.events.some((e) => e.type === "roundStarted") ||
    battle.whisperingWoodsRound === round
  )
    return result;
  const targets = battle.entities.filter((e) => e.side === "hero" && !e.dead).map((e) => e.id);
  const paid = triggerBattlePassive(battle, original.seed, targets, { type: "stress", amount: 1 });
  if (paid.status === "refused") return rejectBattleCommand(original, paid.reason);
  const pressure = resolveBattlePressure({
    state: { ...result.state, battle: { ...paid.battle, whisperingWoodsRound: round } },
    events: [
      ...result.events,
      ...paid.events,
      {
        type: "dungeonUpdated",
        message: `Whispering Woods：第 ${round} 轮开始，存活英雄压力 +1（R-264）`,
      },
    ],
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(pressure, pressureCasualties(battle, pressure));
  return endAfterCasualties(removed) ?? removed;
}
