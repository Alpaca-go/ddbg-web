import type { ApplyResult, GameState, PendingChoice } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { discardHeldTrinket, trinketPoolProblem } from "./trinket-acquisition";

function context(state: GameState) {
  const d = state.dungeon!;
  const b = state.battle;
  const heroes = b
    ? b.entities
        .filter((e) => e.side === "hero")
        .map((e) => ({
          id: e.id,
          dead: e.dead,
          heroStatId: e.heroStatId,
          ...(d.heroes.find((h) => h.id === e.id)?.level === undefined
            ? {}
            : { level: d.heroes.find((h) => h.id === e.id)!.level! }),
        }))
    : d.heroes;
  return {
    d,
    b,
    heroes,
    pool: b?.trinkets ?? d.trinkets,
    stats: b?.heroStats ?? d.battleCatalog?.heroStats ?? [],
  };
}

/** 可用的已接通I级候选；后续驿站入口复用，目录不等于整个核心盒已完成。 */
export function replacementHeroCandidates(d: DungeonState) {
  const catalog = d.battleCatalog;
  if (!catalog) return [];
  const unavailable = new Set([
    ...(d.deadHeroNames ?? []),
    ...d.heroes.flatMap((h) =>
      catalog.heroStats.filter((s) => s.id === h.heroStatId).map((s) => s.name),
    ),
  ]);
  return catalog.heroStats.filter(
    (s) =>
      s.level === 1 &&
      s.attributesVerified &&
      !unavailable.has(s.name) &&
      catalog.skills.filter(
        (skill) => skill.hero === s.name && skill.level === 1 && !skill.verification.unverified,
      ).length === 7,
  );
}

type EstateOption = { id: string; label: string; take?: string; discard?: string };
function estateOptions(state: GameState) {
  const { heroes, pool } = context(state);
  if (!pool || trinketPoolProblem(pool, heroes)) return null;
  const held = pool.held.find((c) => heroes.some((h) => h.id === c.heroId && h.dead));
  if (!held) return null;
  const card = pool.cards.find((c) => c.id === held.cardId)!;
  const options: EstateOption[] = [];
  if (discardHeldTrinket(pool, held.cardId).status === "resolved")
    options.push({ id: "discard", label: `弃置死者饰品 ${card.name}`, discard: held.cardId });
  for (const hero of heroes.filter((h) => !h.dead)) {
    const owned = pool.held.filter((c) => c.heroId === hero.id);
    if (owned.length < hero.level!)
      options.push({
        id: `take:${hero.id}`,
        label: `${hero.id}正面装备 ${card.name}`,
        take: hero.id,
      });
    else
      for (const old of owned)
        if (discardHeldTrinket(pool, old.cardId).status === "resolved")
          options.push({
            id: `replace:${JSON.stringify([hero.id, old.cardId])}`,
            label: `${hero.id}弃置 ${pool.cards.find((c) => c.id === old.cardId)!.name}，正面装备 ${card.name}`,
            take: hero.id,
            discard: old.cardId,
          });
  }
  return { held, options };
}

/** 每条成功命令后记录死亡并插入饰品选择；原战斗/探索待选保留在原处。 */
export function continueDeathEstates(result: ApplyResult): ApplyResult {
  const state = result.state;
  if (!state.dungeon) return result;
  const { d, heroes, stats } = context(state);
  const names = heroes
    .filter((h) => h.dead)
    .flatMap((h) =>
      stats.filter((s) => s.id === h.heroStatId && s.attributesVerified).map((s) => s.name),
    );
  const added = [...new Set(names)].filter((n) => !d.deadHeroNames?.includes(n));
  let next = added.length
    ? { ...state, dungeon: { ...d, deadHeroNames: [...(d.deadHeroNames ?? []), ...added] } }
    : state;
  const estate = estateOptions(next);
  const events = [
    ...result.events,
    ...(added.length
      ? [
          {
            type: "dungeonUpdated" as const,
            message: `战役死亡名单：${added.join("、")}；本战役不可再选（R31）`,
          },
        ]
      : []),
  ];
  if (!estate) return { ...result, state: next, events };
  const cursor = next.dungeon!.deathChoiceCursor ?? 0;
  const choice: PendingChoice = {
    id: `death-trinket:${cursor}:${estate.held.cardId}`,
    actorId: estate.held.heroId,
    prompt: "英雄死亡：由存活队友接收饰品或弃置（R31）",
    options: estate.options.map(({ id, label }) => ({ id, label })),
  };
  next = {
    ...next,
    dungeon: { ...next.dungeon!, deathTrinketChoice: choice, deathChoiceCursor: cursor + 1 },
  };
  return { state: next, events, pendingChoice: choice };
}

export function chooseDeathTrinket(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const choice = state.dungeon?.deathTrinketChoice;
  const estate = state.dungeon ? estateOptions(state) : null;
  const option = estate?.options.find((o) => o.id === optionId);
  if (
    !choice ||
    choice.id !== choiceId ||
    !choice.options.some((o) => o.id === optionId) ||
    !estate ||
    choice.actorId !== estate.held.heroId ||
    !option
  )
    return rejectBattleCommand(state, "死者饰品选择无效、过期或接收者容量不足");
  let pool = context(state).pool!;
  if (option.discard) {
    const discarded = discardHeldTrinket(pool, option.discard);
    if (discarded.status === "refused") return rejectBattleCommand(state, discarded.reason);
    pool = discarded.pool;
  }
  if (option.take)
    pool = {
      ...pool,
      held: pool.held.map((c) =>
        c.cardId === estate.held.cardId
          ? { ...c, heroId: option.take!, face: "upright" as const }
          : c,
      ),
    };
  const problem = trinketPoolProblem(pool, context(state).heroes);
  if (problem) return rejectBattleCommand(state, problem);
  const { deathTrinketChoice: _choice, ...rest } = state.dungeon!;
  void _choice;
  const next: GameState = {
    ...state,
    dungeon: { ...rest, trinkets: pool },
    ...(state.battle ? { battle: { ...state.battle, trinkets: pool } } : {}),
  };
  const pending = next.battle?.pending?.choice ?? next.dungeon?.pending;
  return continueDeathEstates({
    state: next,
    events: [{ type: "dungeonUpdated", message: `${option.label}；未消耗行动或RNG（R26/R31）` }],
    ...(pending ? { pendingChoice: pending } : {}),
  });
}
