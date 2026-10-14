import type { ApplyResult, GameState, PendingChoice } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem, gainPositiveQuirk, replaceConditionQuirk } from "./conditions";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal, passiveStress } from "./passive";
import { applyPassiveStatus } from "./passive-runtime";
import { statusProjection } from "./status";
import { buildingLevelsProblem, recoveryServices, survivalistServices } from "./hamlet-buildings";
import type { RecoveryServiceId, SurvivalistServiceId } from "./hamlet-buildings";

export type HamletActionCommand =
  | {
      readonly type: "visitHamletBuilding";
      readonly actorId: string;
      readonly serviceId: RecoveryServiceId | SurvivalistServiceId;
      readonly quirkIds: readonly string[];
    }
  | {
      readonly type: "useHamletSkill";
      readonly actorId: string;
      readonly skill: "intimidate" | "zealousSpeech" | "pray" | "chant";
    };
type Hero = DungeonState["heroes"][number];
/** R27 / §10.1：一次恢复压力事件触发一次Resilient；村庄不套低光照承压。 */
function recoverStress(hero: Hero, amount: number) {
  return Math.max(0, hero.stress + passiveStress(hero, -amount, 5).amount);
}
export function currentHamletHero(state: GameState) {
  const d = state.dungeon,
    h = d?.hamlet;
  return h?.phase === "heroActions"
    ? d!.heroes.find((hero) => hero.id === h.heroOrder.find((id) => !h.actedHeroes?.includes(id)))
    : undefined;
}
function syncHero(hero: Hero): Hero {
  return hero.combat
    ? {
        ...hero,
        combat: {
          ...hero.combat,
          stress: hero.stress,
          wounds: hero.wounds!,
          diseaseId: hero.diseaseId ?? null,
          quirkIds: hero.quirkIds ?? [],
          ...(hero.statusStacks
            ? {
                statusStacks: hero.statusStacks,
                ...statusProjection(
                  hero.statusStacks,
                  hero.innateProtection ?? hero.combat.innateProtection,
                ),
              }
            : {}),
        },
      }
    : hero;
}
/** R33：四英雄实际行动完成才减一天；R-042允许Zealous Speech立即结束当天。 */
function finishAction(d: DungeonState, actorId: string, endDay: boolean): DungeonState {
  const h = d.hamlet!,
    actedHeroes = [...(h.actedHeroes ?? []), actorId];
  if (!endDay && actedHeroes.length < h.heroOrder.length)
    return { ...d, hamlet: { ...h, actedHeroes } };
  const remainingDays = (h.remainingDays ?? h.preparationDays!) - 1;
  return {
    ...d,
    hamlet: {
      ...h,
      remainingDays,
      phase: remainingDays ? "awaitingCaretaker" : "preparationComplete",
      day: remainingDays ? h.day + 1 : h.day,
      caretaker: null,
      blockedBuildings: [],
      visitedBuildings: [],
      actedHeroes: [],
      heroOrder: [],
    },
  };
}
/** R33/34、R-042/043：一个公开命令完整支付/结算/占用/推进，拒绝不改金币、牌池或RNG。 */
export function applyHamletAction(state: GameState, command: HamletActionCommand): ApplyResult {
  const d = state.dungeon,
    h = d?.hamlet,
    hero = currentHamletHero(state);
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    !h ||
    h.active ||
    !hero ||
    hero.id !== command.actorId ||
    d.heroes.length !== 4 ||
    d.heroes.some(
      (a) => a.dead || !Number.isSafeInteger(a.stress) || a.stress < 0 || a.stress > 9,
    ) ||
    !h.preparationDays ||
    (h.remainingDays ?? h.preparationDays) < 1 ||
    !Number.isSafeInteger(d.gold) ||
    buildingLevelsProblem(d) ||
    d.gold < 0
  )
    return rejectBattleCommand(state, "请按当天姿态顺序完成当前英雄的村庄行动（R33）");
  let next = d,
    updated = hero,
    endDay = false,
    message: string;
  let pending: PendingChoice | undefined;
  if (command.type === "useHamletSkill") {
    const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
    if (
      !stat?.attributesVerified ||
      stat.level !== 1 ||
      stat.name !==
        (
          {
            intimidate: "HELLION",
            zealousSpeech: "CRUSADER",
            pray: "VESTAL",
            chant: "VESTAL",
          } as const
        )[command.skill]
    )
      return rejectBattleCommand(state, "当前只接已核实I级英雄的这项村庄技能（R-048）");
    if (command.skill === "pray" || command.skill === "chant") {
      const heroes: Hero[] = [];
      for (const target of d.heroes) {
        if (command.skill === "pray" && target.id !== hero.id) {
          heroes.push(target);
          continue;
        }
        const targetStat = d.battleCatalog!.heroStats.find((s) => s.id === target.heroStatId);
        const buff = targetStat?.verified_buff_defence;
        if (
          command.skill === "chant" &&
          (!target.attributesVerified ||
            !targetStat?.attributesVerified ||
            targetStat.level !== 1 ||
            !buff ||
            buff.source !== "print_front" ||
            typeof buff.resistant !== "boolean" ||
            typeof buff.immune !== "boolean")
        )
          return rejectBattleCommand(state, "Chant目标缺少获批Buff防御（R-048）");
        const applied = applyPassiveStatus(
          target,
          command.skill === "pray"
            ? { kind: "debuff", duration: 6 }
            : { kind: "buff", duration: 3 },
          command.skill === "pray" ? "self" : "target",
          command.skill === "chant"
            ? {
                resistances: buff!.resistant ? ["buff"] : [],
                immunities: buff!.immune ? ["buff"] : [],
              }
            : undefined,
        );
        if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
        heroes.push(
          syncHero({
            ...applied.hero,
            stress: recoverStress(target, command.skill === "pray" ? 9 : 1),
          }),
        );
      }
      next = { ...d, heroes };
      message =
        command.skill === "pray"
          ? "Pray：自身压力 −9，Debuff 6t；完成当天行动（Vestal I、R33）"
          : "Chant：全体压力 −1、Buff 3t；完成当天行动（Vestal I、R33）";
    } else if (command.skill === "intimidate") {
      next = {
        ...d,
        hamlet: {
          ...h,
          caretaker: null,
          blockedBuildings: h.blockedBuildings.filter((b) => b !== h.caretaker),
        },
      };
      message = "Intimidate：当天看守人移出，保留其他封锁和英雄占用（R-042）";
    } else if (command.skill === "zealousSpeech" && !h.actedHeroes?.length) {
      next = {
        ...d,
        heroes: d.heroes.map((a) => syncHero({ ...a, stress: recoverStress(a, 5) })),
      };
      endDay = true;
      message = "Zealous Speech：全体压力 −5，当天立即结束，只消耗当天（R-042）";
    } else return rejectBattleCommand(state, "Zealous Speech只能是当天第一个行动（R-042）");
  } else {
    const service = [...recoveryServices(d), ...survivalistServices(d)].find(
      (s) => s.id === command.serviceId,
    );
    if (
      !service ||
      h.blockedBuildings.includes(service.building) ||
      h.visitedBuildings?.includes(service.building)
    )
      return rejectBattleCommand(state, "该建筑已封锁或当天已接待英雄（R33）");
    const ids = command.quirkIds;
    if (
      !Array.isArray(ids) ||
      new Set(ids).size !== ids.length ||
      (command.serviceId !== "removeQuirks" && ids.length)
    )
      return rejectBattleCommand(state, "建筑选项或怪癖选择无效");
    const cost =
      service.effect === "quirks" && ids.length === 2
        ? service.level === 3
          ? 4
          : 5
        : service.cost;
    if (d.gold < cost) return rejectBattleCommand(state, "共享金币不足，未支付或消耗行动");
    if (service.effect === "provisions") {
      const previous = hero.nextQuestProvisionDice === undefined ? 0 : hero.nextQuestProvisionDice;
      if (
        !Number.isSafeInteger(previous) ||
        previous < 0 ||
        !Number.isSafeInteger(previous + service.amount)
      )
        return rejectBattleCommand(state, "下次任务奖励补给骰数量无效，未付款或消耗行动（R-041）");
      updated = { ...hero, nextQuestProvisionDice: previous + service.amount };
    } else if (service.effect === "stress")
      updated = { ...hero, stress: recoverStress(hero, service.amount) };
    else if (service.effect === "heal") {
      if (!hero.attributesVerified || hero.life === undefined || hero.wounds === undefined)
        return rejectBattleCommand(state, "治疗缺已核实Life / 伤口（R-048）");
      const health = resolveHeroHealth(
        { life: hero.life, wounds: hero.wounds, dead: false },
        { type: "heal", amount: passiveHeal(hero, service.amount) },
      );
      if (health.status !== "resolved") return rejectBattleCommand(state, "治疗状态无效（R29）");
      updated = { ...hero, wounds: health.state.wounds };
    } else {
      const pool = d.conditions,
        problem = pool ? conditionPoolProblem(pool, d.heroes) : "缺疾病 / 怪癖池";
      if (problem || !pool) return rejectBattleCommand(state, problem!);
      if (service.effect === "positiveQuirk") {
        const gained = gainPositiveQuirk(pool, d.heroes, hero.id, state.seed, d.cursor);
        if (gained.status === "refused") return rejectBattleCommand(state, gained.reason);
        next = {
          ...d,
          conditions: gained.pool,
          cursor: gained.cursor,
        };
        updated = gained.heroes.find((a) => a.id === hero.id)!;
        if (gained.replaceOptions) {
          pending = {
            id: `hamlet-abbey-quirk:${d.decision}`,
            actorId: hero.id,
            prompt: "修道院获得第四怪癖：选择替换已有正面怪癖，或弃置新卡",
            options: gained.replaceOptions.map((id) => ({
              id,
              label: `${pool.quirks.find((q) => q.id === id)!.name}${id === gained.quirkId ? "（弃置新卡）" : "（替换已有）"}`,
            })),
          };
        }
      } else if (service.effect === "disease") {
        if (!hero.diseaseId) return rejectBattleCommand(state, "当前英雄没有疾病可移除");
        next = {
          ...d,
          conditions: { ...pool, diseaseDiscard: [...pool.diseaseDiscard, hero.diseaseId] },
        };
        updated = { ...hero, diseaseId: null };
      } else {
        if (ids.length < 1 || ids.length > 2 || ids.some((id) => !hero.quirkIds?.includes(id)))
          return rejectBattleCommand(state, "请选择当前英雄持有的1或2张怪癖（R-043）");
        next = { ...d, conditions: { ...pool, quirkDiscard: [...pool.quirkDiscard, ...ids] } };
        updated = { ...hero, quirkIds: hero.quirkIds!.filter((id) => !ids.includes(id)) };
      }
    }
    next = {
      ...next,
      gold: d.gold - cost,
      heroes: d.heroes.map((a) => (a.id === hero.id ? syncHero(updated) : a)),
      hamlet: { ...h, visitedBuildings: [...(h.visitedBuildings ?? []), service.building] },
    };
    message = `${hero.id}访问${service.building}，支付${cost}金币并完成一个选项（R33/34）`;
  }
  if (pending)
    return {
      state: { ...state, dungeon: { ...next, pending, decision: d.decision + 1 } },
      events: [{ type: "dungeonUpdated", message }],
      pendingChoice: pending,
    };
  next = finishAction(next, hero.id, endDay);
  return { state: { ...state, dungeon: next }, events: [{ type: "dungeonUpdated", message }] };
}
/** R26/R33：已付款并占用；选择仅收尾当前访问，不重抽、不重复收费。 */
export function chooseAbbeyQuirk(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    pending = d?.pending,
    hero = currentHamletHero(state);
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    !pending ||
    !pending.id.startsWith("hamlet-abbey-quirk:") ||
    pending.id !== choiceId ||
    !pending.options.some((o) => o.id === optionId) ||
    !hero ||
    hero.id !== pending.actorId ||
    d.conditions?.incomingQuirk?.heroId !== hero.id ||
    !d.hamlet?.visitedBuildings?.includes("abbey")
  )
    return rejectBattleCommand(state, "请完成当前修道院正面怪癖选择");
  const applied = replaceConditionQuirk(d.conditions, d.heroes, optionId);
  if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
  const next = finishAction(
    {
      ...d,
      pending: null,
      conditions: applied.pool,
      heroes: applied.heroes.map(syncHero),
    },
    hero.id,
    false,
  );
  return {
    state: { ...state, dungeon: next },
    events: [
      {
        type: "dungeonUpdated",
        message: "修道院正面怪癖选择完成，当前英雄的村庄行动已结束（R26/R33）",
      },
    ],
  };
}
/** UI只展示引擎接受的完整行动；修道院选择具体牌组合，包含正负怪癖。 */
export function hamletActionOptions(state: GameState) {
  const hero = currentHamletHero(state);
  if (!hero) return [];
  const options: { label: string; command: HamletActionCommand }[] = [];
  for (const service of [
    ...recoveryServices(state.dungeon!),
    ...survivalistServices(state.dungeon!),
  ]) {
    const serviceId = service.id;
    const groups =
      serviceId === "removeQuirks"
        ? (hero.quirkIds ?? []).flatMap((id, i, all) => [
            [id],
            ...all.slice(i + 1).map((other) => [id, other]),
          ])
        : [[]];
    for (const quirkIds of groups)
      options.push({
        label:
          serviceId === "removeQuirks"
            ? `修道院 ${["I", "II", "III"][service.level - 1]}：移除${quirkIds.map((id) => state.dungeon!.conditions?.quirks.find((q) => q.id === id)?.name ?? id).join("、")}（${quirkIds.length === 2 ? (service.level === 3 ? 4 : 5) : service.cost} 金）`
            : service.label,
        command: {
          type: "visitHamletBuilding",
          actorId: hero.id,
          serviceId,
          quirkIds,
        },
      });
  }
  options.push(
    {
      label: "Intimidate：移出当天看守人",
      command: { type: "useHamletSkill", actorId: hero.id, skill: "intimidate" },
    },
    {
      label: "Zealous Speech：全体压力 −5，结束当天",
      command: { type: "useHamletSkill", actorId: hero.id, skill: "zealousSpeech" },
    },
    {
      label: "Pray：自身压力 −9，Debuff 6t",
      command: { type: "useHamletSkill", actorId: hero.id, skill: "pray" },
    },
    {
      label: "Chant：全体压力 −1，Buff 3t",
      command: { type: "useHamletSkill", actorId: hero.id, skill: "chant" },
    },
  );
  return options.filter(
    (o) => !applyHamletAction(state, o.command).events.some((e) => e.type === "commandRefused"),
  );
}
