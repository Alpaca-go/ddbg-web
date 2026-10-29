import type { ApplyResult, Command, GameState } from "../command";
import type { DungeonState } from "../dungeon";
import { rejectBattleCommand } from "../battle";
import { nextBattleRoll } from "../battle-roll";
import { readActiveBossThreatScript } from "./threat-passive-runtime";
import { runBossHook } from "./hooks";

/** R-125：在首日看守人就绪后掷四名英雄的 d10；并列待选，不重掷。 */
export function beginHauntedGraveyard(result: ApplyResult): ApplyResult {
  const { state } = result,
    d = state.dungeon!,
    h = d.hamlet!;
  if (h.day !== 1 || h.hauntedGraveyard) return result;
  const script = readActiveBossThreatScript(d);
  const effect =
    script && runBossHook(script, "threatPassiveHamlet", { scriptId: script.id, side: "hamlet" });
  if (!effect || effect.status !== "ok" || effect.effect !== "firstDayGraveyardGuard")
    return result;
  if (
    h.heroOrder.length !== 4 ||
    new Set(h.heroOrder).size !== 4 ||
    h.heroOrder.some((id) => !d.heroes.some((hero) => hero.id === id && !hero.dead)) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 4)
  )
    return rejectBattleCommand(state, "Haunted Graveyard 缺四名有效英雄或 RNG 游标（R-048）");
  let cursor = d.cursor;
  const rolls = h.heroOrder.map((heroId) => ({
    heroId,
    roll: nextBattleRoll(state.seed, cursor++),
  }));
  const lowest = Math.min(...rolls.map((r) => r.roll));
  const tied = rolls.filter((r) => r.roll === lowest);
  const name = (heroId: string) =>
    d.battleCatalog?.heroStats.find(
      (stat) => stat.id === d.heroes.find((hero) => hero.id === heroId)?.heroStatId,
    )?.name ?? heroId;
  const choice =
    tied.length > 1
      ? {
          id: `hamlet-haunted:${d.decision}`,
          actorId: "party",
          prompt: "Haunted Graveyard：从并列最低点数的英雄中选择一名首日墓地守卫（R-125）",
          options: tied.map((r) => ({ id: r.heroId, label: `${name(r.heroId)}（d10 ${r.roll}）` })),
        }
      : undefined;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        ...(choice ? { pending: choice, decision: d.decision + 1 } : {}),
        hamlet: {
          ...h,
          hauntedGraveyard: { rolls, ...(choice ? {} : { guardHeroId: tied[0]!.heroId }) },
        },
      },
    },
    events: [
      ...result.events,
      {
        type: "dungeonUpdated",
        message: `Haunted Graveyard：${rolls.map((r) => `${r.heroId}:${r.roll}`).join("、")}；${choice ? "并列最低，等待玩家选择守卫" : `${tied[0]!.heroId} 首日必须去墓地守卫`}（R-125）`,
      },
    ],
    ...(choice ? { pendingChoice: choice } : {}),
  };
}

export function chooseHauntedGraveyard(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    h = d?.hamlet,
    pending = d?.pending,
    duty = h?.hauntedGraveyard;
  if (
    !d ||
    !h ||
    d.phase !== "inHamlet" ||
    h.phase !== "heroActions" ||
    h.day !== 1 ||
    !duty ||
    duty.guardHeroId ||
    pending?.id !== choiceId ||
    !pending.id.startsWith("hamlet-haunted:") ||
    !pending.options.some((o) => o.id === optionId) ||
    !duty.rolls.some(
      (r) => r.heroId === optionId && r.roll === Math.min(...duty.rolls.map((r) => r.roll)),
    )
  )
    return rejectBattleCommand(state, "墓地守卫选择不存在、已过期或非并列最低者");
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        pending: null,
        hamlet: { ...h, hauntedGraveyard: { ...duty, guardHeroId: optionId } },
      },
    },
    events: [{ type: "dungeonUpdated", message: `${optionId} 首日必须去墓地守卫（R-125）` }],
  };
}

export function isHauntedGraveyardGuard(d: DungeonState, heroId: string | undefined): boolean {
  const h = d.hamlet;
  return (
    !!heroId &&
    h?.day === 1 &&
    h.phase === "heroActions" &&
    h.hauntedGraveyard?.guardHeroId === heroId &&
    d.heroes.some((hero) => hero.id === heroId && !hero.dead) &&
    !h.actedHeroes?.includes(heroId)
  );
}

/** 守卫不能以其它行动或全日结束技能绕过；免费换位不改变指定英雄身份。 */
export function hauntedHamletCommandProblem(
  state: GameState,
  command: Command,
): string | undefined {
  const d = state.dungeon,
    h = d?.hamlet;
  if (!d || !isHauntedGraveyardGuard(d, h?.hauntedGraveyard?.guardHeroId)) return undefined;
  if (command.type === "useHamletSkill" && command.skill === "zealousSpeech")
    return "请先完成 Haunted Graveyard 守卫，不能提前结束首日（R-125）";
  const current = h!.heroOrder.find((id) => !h!.actedHeroes?.includes(id));
  if (!isHauntedGraveyardGuard(d, current)) return undefined;
  if (
    command.type === "visitHamletBuilding" &&
    ["graveyardGuard", "graveyardVirtue"].includes(command.serviceId)
  )
    return undefined;
  if (
    [
      "visitHamletBuilding",
      "useHamletSkill",
      "visitGuild",
      "visitNomadWagon",
      "visitBlacksmith",
    ].includes(command.type)
  )
    return "当前英雄首日必须去墓地守卫，可选择守卫或可用的墓地服务（R-125）";
  return undefined;
}
