import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal } from "./passive";
import { applyPassiveHero, applyPassiveStatus } from "./passive-runtime";
import { finishHamletAction } from "./hamlet-actions";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { statusProjection } from "./status";

type Hero = DungeonState["heroes"][number];

/** Hero STAT FRONT/BACK p19、FRONT p20：治疗量按等级；III Buff 图标见 R-097。 */
const reviewed = {
  "hero_stat:p019:front": { level: 1, heal: 2 },
  "hero_stat:p019:back": { level: 2, heal: 4 },
  "hero_stat:p020:front": { level: 3, heal: 5 },
} as const;

export function darkRitualHealing(heroStatId: string) {
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

/**
 * Hero STAT：Hamlet Skill Dark Ritual —
 * Self {stress} +1,
 * {target_hero} : {heal} N , {stress} -2, {buff} 3t.
 * I/II Buff 图标 confirmed（`2af41c1ca4`）；III 的 `4f7549c1b8` 按 R-097 LIMITED 解释为 Buff。
 */
export function useDarkRitual(state: GameState, actor: Hero, targetId: string): ApplyResult {
  const d = state.dungeon!;
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === actor.heroStatId);
  const row = reviewed[actor.heroStatId as keyof typeof reviewed];
  const target = d.heroes.find((h) => h.id === targetId);
  const targetStat = d.battleCatalog?.heroStats.find((s) => s.id === target?.heroStatId);
  const buff = targetStat?.verified_buff_defence;
  if (
    !row ||
    !actor.attributesVerified ||
    !stat?.attributesVerified ||
    stat.name !== "OCCULTIST" ||
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
    !buff ||
    buff.source !== "print_front" ||
    typeof buff.resistant !== "boolean" ||
    typeof buff.immune !== "boolean"
  )
    return rejectBattleCommand(
      state,
      "Dark Ritual需要获核秘术师I–III与存活目标、Life和获批Buff防御（R-048/R-097）",
    );

  // 1) Self stress +1
  const stressed = applyPassiveHero(actor, { type: "stress", amount: 1 }, state.seed, d.cursor, 5);
  if (stressed.status === "refused") return rejectBattleCommand(state, stressed.reason);

  // 2) Target line: heal → stress −2 → Buff 3t（自身目标时接在 Self +1 之后）
  const subject: Hero = actor.id === target.id ? stressed.hero : target;
  const health = resolveHeroHealth(
    { life: subject.life!, wounds: subject.wounds!, dead: false },
    { type: "heal", amount: passiveHeal(subject, row.heal) },
  );
  if (health.status !== "resolved") return rejectBattleCommand(state, "Dark Ritual治疗状态无效");

  const healed: Hero = { ...subject, wounds: health.state.wounds };
  const eased = applyPassiveHero(
    healed,
    { type: "stress", amount: -2 },
    state.seed,
    stressed.cursor,
    5,
  );
  if (eased.status === "refused") return rejectBattleCommand(state, eased.reason);

  const buffed = applyPassiveStatus(eased.hero, { kind: "buff", duration: 3 }, "target", {
    resistances: buff.resistant ? ["buff"] : [],
    immunities: buff.immune ? ["buff"] : [],
  });
  if (buffed.status === "refused") return rejectBattleCommand(state, buffed.reason);

  const finalTarget = sync(buffed.hero);
  const finalActor = actor.id === target.id ? finalTarget : sync(stressed.hero);
  const party = d.heroes.map((h) =>
    h.id === actor.id ? finalActor : h.id === target.id ? finalTarget : h,
  );

  const paid: GameState = {
    ...state,
    dungeon: {
      ...d,
      cursor: eased.cursor,
      heroes: party,
      phase: "blockedPressure",
      pressureSource: "hamletDarkRitual",
      hamletDarkRitualActorId: actor.id,
    },
  };
  const next =
    finalActor.stress === 10 && !finalActor.dead
      ? resolveDungeonPressure(paid)
      : completeDarkRitualAction(paid);
  return {
    ...next,
    events: [
      ...stressed.events,
      ...eased.events,
      {
        type: "dungeonUpdated",
        message: `Dark Ritual：自身压力+1；${target.id}治疗${row.heal}、压力−2、Buff 3t（Hero STAT、R33、R-097）`,
      },
      ...next.events,
    ],
  };
}

/** 所有效果已付，只同步意志结果/等待补人并结束原行动。 */
export function completeDarkRitualAction(state: GameState): ApplyResult {
  const d = state.dungeon!,
    actorId = d.hamletDarkRitualActorId;
  if (!actorId || !d.hamlet || !d.hamletReturn || d.pressureSource !== "hamletDarkRitual")
    return rejectBattleCommand(state, "Dark Ritual续接缺少已付费行动人");
  const heroes = d.heroes.map(sync);
  if (heroes.some((h) => h.dead))
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          heroes,
          phase: "inHamlet",
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
          replacementResume: "hamletDarkRitual",
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: "Dark Ritual压力导致死亡，等待补人后结束原行动（R31）",
        },
      ],
    };
  const { hamletDarkRitualActorId: _actor, pressureSource: _source, ...rest } = d;
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
    events: [{ type: "dungeonUpdated", message: "Dark Ritual完成当天一个行动（R33）" }],
  };
}
