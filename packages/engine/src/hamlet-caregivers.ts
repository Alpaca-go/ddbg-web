import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";

function caregiversProblem(state: GameState) {
  const d = state.dungeon;
  return !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.hamlet?.active !== "hamlet_event:p012" ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((hero) => hero.id)).size !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    !d.conditions ||
    d.conditions.incomingQuirk
    ? "请先完成回村和死亡英雄补位，不能结算Caregivers Convention"
    : (conditionPoolProblem(d.conditions, d.heroes) ?? hamletEventCompletionProblem(d));
}
function continueCaregivers(state: GameState): ApplyResult {
  const d = state.dungeon!,
    h = d.hamlet!;
  const id = h.eventRemainingHeroes?.[0];
  if (!id) return completeHamletEvent(state);
  const hero = d.heroes.find((candidate) => candidate.id === id)!;
  const pending = {
    id: `hamlet-caregivers:${d.decision}`,
    actorId: id,
    prompt: `Caregivers Convention：${id}可免费移除一张怪癖，或放弃（卡面p12）`,
    options: [
      ...(hero.quirkIds ?? []).map((quirkId) => ({
        id: quirkId,
        label: `移除 ${d.conditions!.quirks.find((quirk) => quirk.id === quirkId)!.name}`,
      })),
      { id: "skip", label: "放弃移除怪癖" },
    ],
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}
/** 卡面p12、R26/R32：每名英雄可移除任意一张怪癖。没有持牌的英雄无需空选择。 */
export function beginCaregiversConvention(state: GameState): ApplyResult {
  const problem = caregiversProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  const d = state.dungeon!,
    stances = ["aggressive", "defensive", "ranged", "support"];
  const order = [...d.heroes]
    .sort((a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!))
    .filter((hero) => hero.quirkIds?.length)
    .map((hero) => hero.id);
  return continueCaregivers({
    ...state,
    dungeon: { ...d, hamlet: { ...d.hamlet!, eventRemainingHeroes: order } },
  });
}
/** 一次只处理当前英雄。选择期间不付款、不访问建筑、不推进准备日、不消耗RNG。 */
export function chooseCaregiversConvention(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const problem = caregiversProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  const d = state.dungeon!,
    h = d.hamlet!,
    pending = d.pending;
  const order = h.eventRemainingHeroes;
  const hero = d.heroes.find((candidate) => candidate.id === order?.[0]);
  if (
    !pending ||
    !pending.id.startsWith("hamlet-caregivers:") ||
    pending.id !== choiceId ||
    !hero ||
    hero.id !== pending.actorId ||
    !Array.isArray(order) ||
    !order.length ||
    new Set(order).size !== order.length ||
    order.some((id) => !d.heroes.some((candidate) => candidate.id === id)) ||
    !pending.options.some((option) => option.id === optionId) ||
    (optionId !== "skip" && !hero.quirkIds?.includes(optionId))
  )
    return rejectBattleCommand(state, "请按事件顺序为当前英雄选择一张持有怪癖，或放弃");
  const quirkIds = (hero.quirkIds ?? []).filter((id) => id !== optionId);
  const next = continueCaregivers({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      conditions:
        optionId === "skip"
          ? d.conditions!
          : { ...d.conditions!, quirkDiscard: [...d.conditions!.quirkDiscard, optionId] },
      heroes:
        optionId === "skip"
          ? d.heroes
          : d.heroes.map((candidate) =>
              candidate.id === hero.id
                ? {
                    ...candidate,
                    quirkIds,
                    ...(candidate.combat ? { combat: { ...candidate.combat, quirkIds } } : {}),
                  }
                : candidate,
            ),
      hamlet: { ...h, eventRemainingHeroes: order.slice(1) },
    },
  });
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: `${hero.id}：${optionId === "skip" ? "放弃移除怪癖" : `免费移除怪癖 ${optionId}`}（Caregivers Convention、卡面p12）`,
      },
      ...next.events,
    ],
  };
}
