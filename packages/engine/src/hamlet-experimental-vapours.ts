import { healingTrinketReaction } from "./trinket-reactions";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal } from "./passive";
import { applyPassiveHero } from "./passive-runtime";
import { finishHamletAction } from "./hamlet-actions";
import { resolveDungeonPressure } from "./dungeon-pressure";

type Hero = DungeonState["heroes"][number];
const reviewed = {
  "hero_stat:p013:front": { level: 1, heal: 4 },
  "hero_stat:p013:back": { level: 2, heal: 7 },
  "hero_stat:p014:front": { level: 3, heal: 9 },
} as const;
export function experimentalVapoursHealing(heroStatId: string) {
  return reviewed[heroStatId as keyof typeof reviewed]?.heal;
}
function sync(hero: Hero): Hero {
  return hero.combat
    ? {
        ...hero,
        combat: {
          ...hero.combat,
          wounds: hero.wounds!,
          stress: hero.stress,
          diseaseId: hero.diseaseId ?? null,
          dead: hero.dead ?? false,
          resolveTested: hero.resolveTested ?? false,
          resolveCardId: hero.resolveCardId ?? null,
        },
      }
    : hero;
}

/** 当前版Hero STAT FRONT p13/p14、BACK p13：治疗→除病→压力+3，R19/21/29/33。 */
export function useExperimentalVapours(
  state: GameState,
  actor: Hero,
  targetId: string,
): ApplyResult {
  const d = state.dungeon!,
    pool = d.conditions;
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === actor.heroStatId);
  const row = reviewed[actor.heroStatId as keyof typeof reviewed];
  const target = d.heroes.find((h) => h.id === targetId);
  const targetStat = d.battleCatalog?.heroStats.find((s) => s.id === target?.heroStatId);
  if (
    !row ||
    !actor.attributesVerified ||
    !stat?.attributesVerified ||
    stat.name !== "PLAGUE DOCTOR" ||
    stat.level !== row.level ||
    actor.level !== row.level ||
    !target ||
    target.dead ||
    !target.attributesVerified ||
    !targetStat?.attributesVerified ||
    !Number.isSafeInteger(target.life) ||
    target.life !== targetStat.life ||
    !Number.isSafeInteger(target.wounds) ||
    target.wounds! < 0 ||
    target.wounds! > target.life! ||
    !pool ||
    conditionPoolProblem(pool, d.heroes)
  )
    return rejectBattleCommand(
      state,
      "Experimental Vapours需要获核瘟疫医生与存活目标、Life和完整疾病/怪癖池（R-048）",
    );
  const health = resolveHeroHealth(
    { life: target.life!, wounds: target.wounds!, dead: false },
    {
      type: "heal",
      amount: passiveHeal(target, healingTrinketReaction(d, actor.id, target.id, row.heal)),
    },
  );
  if (health.status !== "resolved")
    return rejectBattleCommand(state, "Experimental Vapours治疗状态无效");
  // 原有疾病仍影响治疗；移除疾病后，压力步骤读取治愈后的持牌状态。
  const cured = { ...target, wounds: health.state.wounds, diseaseId: null };
  const applied = applyPassiveHero(cured, { type: "stress", amount: 3 }, state.seed, d.cursor, 5);
  if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
  const paid: GameState = {
    ...state,
    dungeon: {
      ...d,
      cursor: applied.cursor,
      conditions: {
        ...pool,
        diseaseDiscard: [...pool.diseaseDiscard, ...(target.diseaseId ? [target.diseaseId] : [])],
      },
      heroes: d.heroes.map((h) => (h.id === target.id ? sync(applied.hero) : h)),
      phase: "blockedPressure",
      pressureSource: "hamletVapours",
      hamletVapoursActorId: actor.id,
    },
  };
  const next =
    applied.hero.stress === 10 && !applied.hero.dead
      ? resolveDungeonPressure(paid)
      : completeExperimentalVapoursAction(paid);
  return {
    ...next,
    events: [
      ...applied.events,
      {
        type: "dungeonUpdated",
        message: `Experimental Vapours：${target.id}治疗${row.heal}、移除疾病、压力+3（Hero STAT、R33/R-090）`,
      },
      ...next.events,
    ],
  };
}

/** 所有效果已付，只同步意志结果/等待补人并结束原行动；不重复治疗/除病/压力。 */
export function completeExperimentalVapoursAction(state: GameState): ApplyResult {
  const d = state.dungeon!,
    actorId = d.hamletVapoursActorId;
  if (!actorId || !d.hamlet || !d.hamletReturn || d.pressureSource !== "hamletVapours")
    return rejectBattleCommand(state, "Experimental Vapours续接缺少已付费行动人");
  const heroes = d.heroes.map(sync);
  if (heroes.some((h) => h.dead))
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          heroes,
          phase: "inHamlet",
          // 死亡队友尚未行动时取消其余项；替补不获得额外村庄行动。
          hamlet: {
            ...d.hamlet,
            actedHeroes: [
              ...new Set([
                ...(d.hamlet.actedHeroes ?? []),
                ...heroes.filter((h) => h.dead && h.id !== actorId).map((h) => h.id),
              ]),
            ],
          },
          hamletReturn: { ...d.hamletReturn, phase: "awaitingReplacement" },
          replacementResume: "hamletVapours",
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: "Experimental Vapours压力导致死亡，等待补人后结束原行动（R31/R-090）",
        },
      ],
    };
  const { hamletVapoursActorId: _actor, pressureSource: _source, ...rest } = d;
  void _actor;
  void _source;
  return {
    state: {
      ...state,
      dungeon: finishHamletAction(
        {
          ...rest,
          heroes,
          phase: "inHamlet",
          hamletReturn: { ...d.hamletReturn, phase: "complete" },
        },
        actorId,
        false,
      ),
    },
    events: [{ type: "dungeonUpdated", message: "Experimental Vapours完成当天一个行动（R33）" }],
  };
}
