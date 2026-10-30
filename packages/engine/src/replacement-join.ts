import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { ownedHeroSkills, heroSkillSlotCount } from "./hero-loadout";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { continueDungeonExploration } from "./dungeon-exploration";
import { awaitDungeonRoomCurio } from "./dungeon-curio-room";
import { resolveCurioRows } from "./dungeon-curio-effects";
import { resumeHamletConversion, settleHamletProvisions } from "./hamlet-return";
import { finishHamletAction } from "./hamlet-actions";
import { completeExperimentalVapoursAction } from "./hamlet-experimental-vapours";
import { completeDarkRitualAction } from "./hamlet-dark-ritual";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;
/** R31、R-039、R-092：战后才入队；新英雄不继承死者未完成的个人效果。 */
export function joinPreparedReplacements(state: GameState): ApplyResult {
  const d = state.dungeon,
    prepared = d?.preparedReplacements ?? [],
    catalog = d?.battleCatalog;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.pending ||
    d.deathTrinketChoice ||
    d.replacementPreparation ||
    d.campaignFailure ||
    !catalog ||
    !d.replacementResume ||
    !prepared.length ||
    (d.phase !== "awaitingReplacement" &&
      !(d.phase === "inHamlet" && d.hamletReturn?.phase === "awaitingReplacement"))
  )
    return refuse("先完成死亡饰品和全部替补准备；战斗内不能入队（R31）");
  const dead = d.heroes.filter((h) => h.dead),
    alive = d.heroes.filter((h) => !h.dead);
  if (
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    !dead.length ||
    prepared.length !== dead.length ||
    new Set(prepared.map((p) => p.deadHeroId)).size !== dead.length ||
    prepared.some((p) => !dead.some((h) => h.id === p.deadHeroId)) ||
    new Set(alive.map((h) => h.stance)).size !== alive.length ||
    alive.some((h) => !stances.includes(h.stance!)) ||
    dead.some(
      (h) =>
        h.diseaseId ||
        h.quirkIds?.length ||
        h.resolveCardId ||
        !d.deadHeroNames?.includes(
          catalog.heroStats.find((s) => s.id === h.heroStatId)?.name ?? "",
        ),
    )
  )
    return refuse("死亡登记/姿态/替补对应关系无效，或共享卡尚未回收（R31、R-091）");
  const names = alive.map((h) => catalog.heroStats.find((s) => s.id === h.heroStatId)?.name);
  for (const { hero: h } of prepared) {
    const stat = catalog.heroStats.find((s) => s.id === h.heroStatId);
    if (
      !stat?.attributesVerified ||
      !h.attributesVerified ||
      h.level !== stat.level ||
      h.heroLevel !== stat.level ||
      h.life !== stat.life ||
      ![1, 2, 3].includes(stat.level) ||
      !h.id ||
      d.heroes.some((old) => old.id === h.id) ||
      h.dead ||
      h.wounds !== 0 ||
      h.stress !== 0 ||
      h.diseaseId ||
      h.quirkIds?.length ||
      h.resolveCardId ||
      h.resolveTested ||
      h.combat ||
      h.statusStacks?.length ||
      h.nextQuestSkillUpgrades?.length ||
      !Number.isSafeInteger(h.xp) ||
      h.xp! < 0 ||
      h.skillIds?.length !== heroSkillSlotCount(stat.level) ||
      !ownedHeroSkills(h, catalog) ||
      d.deadHeroNames?.includes(stat.name)
    )
      return refuse("替补属性/技能/初始状态无效或英雄本战役已死亡（R-039、R-048）");
    names.push(stat.name);
  }
  if (
    new Set(names).size !== 4 ||
    names.some((name) => !name) ||
    new Set(prepared.map((p) => p.hero.id)).size !== prepared.length
  )
    return refuse("替补身份重复或存活英雄身份无效");
  const deadIds = new Set(dead.map((h) => h.id));
  if (
    d.trinkets &&
    (trinketPoolProblem(d.trinkets, d.heroes) || d.trinkets.held.some((t) => deadIds.has(t.heroId)))
  )
    return refuse("死者饰品尚未处置或饰品牌池不守恒");
  const ordered = [
    ...alive.slice().sort((a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!)),
    ...prepared.map((p) => p.hero),
  ];
  const heroes = ordered.map((h, i) => ({
    ...h,
    stance: stances[i]!,
    ...(h.combat ? { combat: { ...h.combat, stance: stances[i]! } } : {}),
  }));
  if (d.conditions) {
    const problem = conditionPoolProblem(d.conditions, heroes);
    if (problem) return refuse(problem);
  }
  const { preparedReplacements: _prepared, replacementResume: resume, ...rest } = d;
  void _prepared;
  let next: DungeonState = {
    ...rest,
    heroes,
    ...(d.exploration?.rolls
      ? {
          exploration: {
            ...d.exploration,
            rolls: d.exploration.rolls.map((r) =>
              deadIds.has(r.heroId) ? { ...r, resolved: true } : r,
            ),
          },
        }
      : {}),
    ...(resume === "trap" && d.roomResolution
      ? {
          roomResolution: {
            ...d.roomResolution,
            resolvedHeroIds: [
              ...new Set([...d.roomResolution.resolvedHeroIds, ...prepared.map((p) => p.hero.id)]),
            ],
          },
        }
      : {}),
    ...(d.hamletReturn
      ? {
          hamletReturn: {
            ...d.hamletReturn,
            order: d.hamletReturn.order.filter((id) => !deadIds.has(id)),
          },
        }
      : {}),
  };
  if (
    next.pendingCurioDraw &&
    deadIds.has(
      d.exploration?.rolls?.find((r) => r.id === next.pendingCurioDraw!.rollId)?.heroId ?? "",
    )
  ) {
    const { pendingCurioDraw: _draw, ...remaining } = next;
    void _draw;
    next = remaining;
  }
  let continued: ApplyResult;
  const asState = () => ({ ...state, dungeon: next });
  switch (resume) {
    case "hamletThreat":
    case "hamletTrinket": {
      if (!next.hamlet || !next.hamletReturn) return refuse("缺少村庄饰品补人续接记录");
      const inherit = (id: string) => prepared.find((p) => p.deadHeroId === id)?.hero.id ?? id;
      next = {
        ...next,
        phase: "inHamlet",
        hamletReturn: { ...next.hamletReturn, phase: "complete" },
        hamlet: {
          ...next.hamlet,
          heroOrder: next.hamlet.heroOrder.map(inherit),
          ...(next.hamlet.actedHeroes ? { actedHeroes: next.hamlet.actedHeroes.map(inherit) } : {}),
        },
      };
      continued = { state: asState(), events: [] };
      break;
    }
    case "hamletVapours": {
      continued = completeExperimentalVapoursAction(asState());
      break;
    }
    case "hamletDarkRitual": {
      continued = completeDarkRitualAction(asState());
      break;
    }
    case "hamletScout": {
      const actorId = next.hamletScoutActorId;
      if (!actorId || !deadIds.has(actorId) || !next.hamlet || !next.hamletReturn)
        return refuse("Scout Ahead死亡续接缺少已付费行动人");
      const { hamletScoutActorId: _actor, pressureSource: _source, ...remaining } = next;
      void _actor;
      void _source;
      next = finishHamletAction(
        {
          ...remaining,
          phase: "inHamlet",
          hamletReturn: { ...next.hamletReturn, phase: "complete" },
        },
        actorId,
        false,
      );
      continued = { state: asState(), events: [] }; // 死者行动已花，未发出的揭示奖励取消。
      break;
    }
    case "hamletConvert":
      if (!next.hamletReturn) return refuse("缺少回村转换续接记录");
      next = {
        ...next,
        phase: "returningToHamlet",
        hamletReturn: { ...next.hamletReturn, phase: "converting" },
      };
      continued = resumeHamletConversion(asState());
      break;
    case "hamletProvisions":
      if (!next.hamletReturn) return refuse("缺少回村补给续接记录");
      next = {
        ...next,
        phase: "returningToHamlet",
        hamletReturn: { ...next.hamletReturn, phase: "provisions" },
      };
      continued = settleHamletProvisions({ state: asState(), events: [] });
      break;
    case "roomCurio":
      next = { ...next, phase: "awaitingRoom" };
      continued = awaitDungeonRoomCurio(asState());
      break;
    case "curio":
      if (!next.curio?.active || deadIds.has(next.curio.active.heroId))
        return refuse("Curio死亡取消尚未完成，不能入队覆盖");
      next = { ...next, phase: "awaitingCurio" };
      if (next.heroes.some((h) => h.stress === 10)) {
        const pressure = resolveDungeonPressure({
          ...asState(),
          dungeon: { ...next, phase: "blockedPressure", pressureSource: "curioProvision" },
        });
        if (pressure.state.dungeon!.phase === "blockedPressure")
          return refuse("Curio余下意志检定未完成");
        const rows =
          pressure.state.dungeon!.phase === "awaitingCurio" && !pressure.pendingChoice
            ? resolveCurioRows(pressure.state)
            : { ...pressure, events: [] };
        continued = { ...rows, events: [...pressure.events, ...rows.events] };
      } else continued = resolveCurioRows(asState());
      break;
    case "scout":
    case "backtracking":
    case "trap":
      next = {
        ...next,
        phase: "blockedPressure",
        pressureSource: resume === "scout" ? "scout" : resume === "trap" ? "room" : "backtracking",
      };
      continued = resolveDungeonPressure(asState());
      break;
    case "exploration":
      if (!next.exploration?.rolls) return refuse("缺少已掷探索骰的续接记录");
      next = { ...next, phase: "awaitingHazards", pressureSource: "exploration" };
      continued = continueDungeonExploration(
        next.heroes.some((h) => h.stress === 10)
          ? resolveDungeonPressure({ ...asState(), dungeon: { ...next, phase: "blockedPressure" } })
          : { state: asState(), events: [] },
      );
      break;
    case "ready":
      next = { ...next, phase: "ready", pressureSource: "provision" };
      continued = next.heroes.some((h) => h.stress === 10)
        ? resolveDungeonPressure({ ...asState(), dungeon: { ...next, phase: "blockedPressure" } })
        : { state: asState(), events: [] };
      break;
    default:
      return refuse("未知补人续接类型，保持原状态");
  }
  const failed = continued.events.find((e) => e.type === "commandRefused");
  if (failed) return refuse(failed.message);
  return {
    ...continued,
    events: [
      {
        type: "dungeonUpdated",
        message:
          "替补正式入队：存活英雄向前补位，新英雄加入最后空姿态；不重扣代币或XP（R31、R-039、R-092）",
      },
      ...continued.events,
    ],
  };
}
