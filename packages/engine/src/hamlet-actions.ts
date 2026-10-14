import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal } from "./passive";

export type HamletActionCommand =
  | {
      readonly type: "visitHamletBuilding";
      readonly actorId: string;
      readonly serviceId:
        "tavern3" | "tavern6" | "heal5" | "heal10" | "cureDisease" | "removeQuirks";
      readonly quirkIds: readonly string[];
    }
  | {
      readonly type: "useHamletSkill";
      readonly actorId: string;
      readonly skill: "intimidate" | "zealousSpeech";
    };
type Hero = DungeonState["heroes"][number];
const services = {
  tavern3: { building: "tavern", cost: 1, amount: 3, label: "酒馆 I：压力 −3（1 金）" },
  tavern6: { building: "tavern", cost: 3, amount: 6, label: "酒馆 I：压力 −6（3 金）" },
  heal5: { building: "sanitarium", cost: 1, amount: 5, label: "疗养院 I：治疗 5（1 金）" },
  heal10: { building: "sanitarium", cost: 3, amount: 10, label: "疗养院 I：治疗 10（3 金）" },
  cureDisease: { building: "sanitarium", cost: 2, amount: 0, label: "疗养院 I：移除疾病（2 金）" },
  removeQuirks: { building: "abbey", cost: 2, amount: 0, label: "修道院 I：移除怪癖" },
} as const;
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
    d.gold < 0
  )
    return rejectBattleCommand(state, "请按当天姿态顺序完成当前英雄的村庄行动（R33）");
  let next = d,
    updated = hero,
    endDay = false,
    message: string;
  if (command.type === "useHamletSkill") {
    const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
    if (
      !stat?.attributesVerified ||
      stat.level !== 1 ||
      (command.skill === "intimidate" ? stat.name !== "HELLION" : stat.name !== "CRUSADER")
    )
      return rejectBattleCommand(state, "当前只接已核实I级英雄的这项村庄技能（R-048）");
    if (command.skill === "intimidate") {
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
        heroes: d.heroes.map((a) => syncHero({ ...a, stress: Math.max(0, a.stress - 5) })),
      };
      endDay = true;
      message = "Zealous Speech：全体压力 −5，当天立即结束，只消耗当天（R-042）";
    } else return rejectBattleCommand(state, "Zealous Speech只能是当天第一个行动（R-042）");
  } else {
    const service = services[command.serviceId];
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
    const cost = command.serviceId === "removeQuirks" && ids.length === 2 ? 5 : service.cost;
    if (d.gold < cost) return rejectBattleCommand(state, "共享金币不足，未支付或消耗行动");
    if (service.building === "tavern")
      updated = { ...hero, stress: Math.max(0, hero.stress - service.amount) };
    else if (command.serviceId === "heal5" || command.serviceId === "heal10") {
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
      if (command.serviceId === "cureDisease") {
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
  next = finishAction(next, hero.id, endDay);
  return { state: { ...state, dungeon: next }, events: [{ type: "dungeonUpdated", message }] };
}
/** UI只展示引擎接受的完整行动；修道院选择具体牌组合，包含正负怪癖。 */
export function hamletActionOptions(state: GameState) {
  const hero = currentHamletHero(state);
  if (!hero) return [];
  const options: { label: string; command: HamletActionCommand }[] = [];
  for (const [serviceId, service] of Object.entries(services)) {
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
            ? `修道院 I：移除${quirkIds.map((id) => state.dungeon!.conditions?.quirks.find((q) => q.id === id)?.name ?? id).join("、")}（${quirkIds.length === 2 ? 5 : 2} 金）`
            : service.label,
        command: {
          type: "visitHamletBuilding",
          actorId: hero.id,
          serviceId: serviceId as keyof typeof services,
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
  );
  return options.filter(
    (o) => !applyHamletAction(state, o.command).events.some((e) => e.type === "commandRefused"),
  );
}
