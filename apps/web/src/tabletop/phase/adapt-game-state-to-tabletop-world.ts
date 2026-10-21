import type { BattleEntity, GameEvent, GameState, SkillStance, TrinketPool } from "@ddbg/engine";
import { monsterCardName, projectMonsterPreparedSkill } from "../resolve-monster-skill-display";
import type {
  TabletopBattleMeta,
  TabletopHeroState,
  TabletopMonsterState,
  TabletopWorldState,
} from "../tabletop-types";

export type AdaptGameStateOptions = {
  readonly events?: readonly GameEvent[];
  readonly heroDisplayName?: (hero: {
    readonly id: string;
    readonly hero?: string | null;
    readonly heroStatId?: string;
  }) => string;
};

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

export type TabletopWorldAdaptation = Pick<TabletopWorldState, "heroes"> & {
  readonly monsters?: readonly TabletopMonsterState[];
  readonly battle?: Partial<TabletopBattleMeta>;
};

function trinketPoolFor(game: GameState): TrinketPool | undefined {
  return game.battle?.trinkets ?? game.dungeon?.trinkets;
}

function trinketsForHero(pool: TrinketPool | undefined, heroId: string) {
  if (!pool) return [];
  return pool.held
    .filter((h) => h.heroId === heroId)
    .map((h) => ({
      cardId: h.cardId,
      face: h.face,
    }));
}

type DungeonHero = NonNullable<GameState["dungeon"]>["heroes"][number];

function heroLevelFrom(entity: BattleEntity | DungeonHero): number {
  const level = entity.heroLevel ?? entity.level ?? 0;
  return level > 0 ? level : 1;
}

function displayName(
  hero: { readonly id: string; readonly hero?: string | null; readonly heroStatId?: string },
  options?: AdaptGameStateOptions,
): string {
  if (hero.hero) return hero.hero;
  return options?.heroDisplayName?.(hero) ?? "—";
}

function projectStatusStacks(
  stacks: readonly { kind: string; remaining: number }[] | undefined,
): TabletopHeroState["statusStacks"] {
  if (!stacks?.length) return [];
  return stacks.filter((s) => s.remaining > 0) as TabletopHeroState["statusStacks"];
}

function projectBattleHero(
  entity: BattleEntity,
  ctx: {
    readonly seat: number;
    readonly trinkets: TrinketPool | undefined;
    readonly actedIds: readonly string[];
    readonly turnActorId: string | null;
    readonly options?: AdaptGameStateOptions;
  },
): TabletopHeroState {
  const level = heroLevelFrom(entity);
  const life = entity.life;
  const wounds = entity.wounds ?? 0;
  const stress = entity.stress ?? 0;
  return {
    id: entity.id,
    hero: displayName(entity, ctx.options),
    ...(entity.heroStatId ? { heroStatId: entity.heroStatId } : {}),
    wounds,
    life: life ?? 0,
    lifeKnown: life !== undefined,
    stress,
    stressFace: null,
    stance: entity.stance ?? "support",
    areaId: entity.areaId,
    heroLevel: level,
    skillIds: entity.skillIds ?? [],
    statusStacks: projectStatusStacks(entity.statusStacks),
    trinketSlotCount: level,
    trinkets: trinketsForHero(ctx.trinkets, entity.id),
    seat: ctx.seat,
    actedThisRound: ctx.actedIds.includes(entity.id),
    isCurrentActor: ctx.turnActorId === entity.id,
    dead: Boolean(entity.dead),
    isEmpty: false,
    quirkCount: entity.quirkIds?.length ?? 0,
    diseaseCount: entity.diseaseId ? 1 : 0,
  };
}

function projectDungeonHero(
  hero: DungeonHero,
  ctx: {
    readonly seat: number;
    readonly trinkets: TrinketPool | undefined;
    readonly turnActorId: string | null;
    readonly actedIds: readonly string[];
    readonly options?: AdaptGameStateOptions;
  },
): TabletopHeroState {
  const combat = hero.combat;
  const level = heroLevelFrom(hero);
  const life = combat?.life ?? hero.life;
  const wounds = combat?.wounds ?? hero.wounds ?? 0;
  const stress = combat?.stress ?? hero.stress ?? 0;
  const stance = combat?.stance ?? hero.stance ?? "support";
  const areaId = combat?.areaId ?? "—";
  const skillIds = combat?.skillIds ?? hero.skillIds ?? [];
  const statusStacks = projectStatusStacks(combat?.statusStacks ?? hero.statusStacks);
  const dead = Boolean(hero.dead || combat?.dead);
  const heroStatId = combat?.heroStatId ?? hero.heroStatId;
  const nameInput: { id: string; hero?: string | null; heroStatId?: string } = {
    id: hero.id,
    hero: combat?.hero ?? null,
  };
  if (heroStatId) nameInput.heroStatId = heroStatId;

  return {
    id: hero.id,
    hero: displayName(nameInput, ctx.options),
    ...(heroStatId ? { heroStatId } : {}),
    wounds,
    life: life ?? 0,
    lifeKnown: life !== undefined,
    stress,
    stressFace: null,
    stance,
    areaId,
    heroLevel: level,
    skillIds,
    statusStacks,
    trinketSlotCount: level,
    trinkets: trinketsForHero(ctx.trinkets, hero.id),
    seat: ctx.seat,
    actedThisRound: ctx.actedIds.includes(hero.id),
    isCurrentActor: ctx.turnActorId === hero.id,
    dead,
    isEmpty: false,
    quirkCount: hero.quirkIds?.length ?? combat?.quirkIds?.length ?? 0,
    diseaseCount: hero.diseaseId || combat?.diseaseId ? 1 : 0,
  };
}

function emptyPartySlot(seat: number): TabletopHeroState {
  return {
    id: `party-slot-${seat}`,
    hero: "—",
    wounds: 0,
    life: 0,
    lifeKnown: false,
    stress: 0,
    stressFace: null,
    stance: "support",
    areaId: "—",
    heroLevel: 0,
    skillIds: [],
    statusStacks: [],
    trinketSlotCount: 0,
    trinkets: [],
    seat,
    actedThisRound: false,
    isCurrentActor: false,
    dead: false,
    isEmpty: true,
    quirkCount: 0,
    diseaseCount: 0,
  };
}

function padPartySlots(heroes: readonly TabletopHeroState[]): TabletopHeroState[] {
  const rows = [...heroes];
  for (let seat = rows.length + 1; seat <= 4; seat += 1) {
    rows.push(emptyPartySlot(seat));
  }
  return rows.slice(0, 4);
}

function sortByStance(heroes: readonly TabletopHeroState[]): TabletopHeroState[] {
  return [...heroes].sort(
    (a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance),
  );
}

function battleTurnContext(game: GameState) {
  const encounter = game.battle?.encounter;
  const turn = encounter?.turn;
  const turnActorId =
    turn && (turn.type === "hero" || turn.type === "monster") ? turn.actorId : null;
  return {
    actedIds: encounter?.actedIds ?? [],
    turnActorId,
    round: encounter?.round ?? 1,
    actionsRemaining: turn?.type === "hero" ? turn.actions : 0,
    deck: encounter?.deck ?? [],
  };
}

function projectBattleHeroes(
  game: GameState,
  options?: AdaptGameStateOptions,
): TabletopHeroState[] {
  const battle = game.battle!;
  const trinkets = trinketPoolFor(game);
  const turnCtx = battleTurnContext(game);
  const heroes = battle.entities
    .filter((e) => e.side === "hero")
    .map((entity, index) =>
      projectBattleHero(entity, {
        seat: index + 1,
        trinkets,
        actedIds: turnCtx.actedIds,
        turnActorId: turnCtx.turnActorId,
        ...(options ? { options } : {}),
      }),
    );
  return padPartySlots(sortByStance(heroes));
}

function projectDungeonHeroes(
  game: GameState,
  options?: AdaptGameStateOptions,
): TabletopHeroState[] {
  const d = game.dungeon!;
  const trinkets = trinketPoolFor(game);
  const turnCtx = game.battle ? battleTurnContext(game) : { actedIds: [], turnActorId: null };
  const heroes = d.heroes.map((hero, index) =>
    projectDungeonHero(hero, {
      seat: index + 1,
      trinkets,
      actedIds: turnCtx.actedIds,
      turnActorId: turnCtx.turnActorId,
      ...(options ? { options } : {}),
    }),
  );
  return padPartySlots(sortByStance(heroes));
}

function projectBattleMonsters(game: GameState): TabletopMonsterState[] {
  const battle = game.battle!;
  const prepared = battle.monsterAction;
  return battle.entities
    .filter((entity) => entity.side === "monster" && !entity.dead)
    .map((entity) => {
      const cardId = entity.monsterCardId ?? "";
      const card = battle.monsters?.find((entry) => entry.id === cardId);
      const life = card?.life ?? entity.life;
      const wounds = entity.wounds ?? 0;
      const skillForActor =
        prepared && prepared.actorId === entity.id
          ? projectMonsterPreparedSkill(prepared, cardId)
          : null;
      const name = cardId ? monsterCardName(cardId) : entity.id;
      return {
        ...(entity.stanceSlots !== undefined ? { stanceSlots: entity.stanceSlots } : {}),
        actedThisRound: battle.encounter?.actedIds.includes(entity.id) ?? false,
        id: entity.id,
        monsterCardId: cardId,
        name,
        wounds,
        life: life ?? 0,
        lifeKnown: life !== undefined,
        areaId: entity.areaId,
        ...(entity.stance ? { stance: entity.stance } : {}),
        statusStacks: projectStatusStacks(entity.statusStacks),
        preparedSkill: skillForActor,
      };
    });
}

function projectBattleMeta(
  game: GameState,
  options?: AdaptGameStateOptions,
): Partial<TabletopBattleMeta> {
  const battle = game.battle;
  if (!battle) return {};
  const turnCtx = battleTurnContext(game);
  const heroCards = turnCtx.deck.filter((s) => s === "hero").length;
  const monsterCards = turnCtx.deck.filter((s) => s === "monster").length;
  const turn = battle.encounter?.turn;
  const turnLabel = !turn
    ? "尚未开始战斗"
    : turn.type === "hero"
      ? `英雄回合 · 剩余 ${turn.actions} 行动`
      : turn.type === "monster"
        ? "怪物回合"
        : turn.type === "awaitingInitiative"
          ? "等待抽取先攻"
          : turn.type === "finished"
            ? turn.outcome === "victory"
              ? "战斗胜利"
              : "第 4 轮结束 · 撤退"
            : turn.reason === "mutualWipeout"
              ? "双方全灭 · 战斗停止"
              : "英雄全灭 · 战斗停止";
  const candidates = [...battle.entities]
    .filter(
      (e) =>
        turn &&
        (turn.type === "hero" || turn.type === "monster" || turn.type === "awaitingInitiative") &&
        e.stance &&
        !e.dead &&
        e.id !== turnCtx.turnActorId &&
        !turnCtx.actedIds.includes(e.id),
    )
    .sort(
      (a, b) =>
        STANCE_ORDER.indexOf(a.stance ?? "support") - STANCE_ORDER.indexOf(b.stance ?? "support"),
    );
  const events = options?.events ?? [];
  const start = events.reduce((last, e, index) => (e.type === "roundStarted" ? index : last), -1);
  const revealed = events
    .slice(start + 1)
    .flatMap((e) =>
      (e.type === "turnStarted" || e.type === "initiativeDiscarded") &&
      e.round === turnCtx.round &&
      e.side
        ? [e.side]
        : [],
    );
  return {
    areas: battle.areas,
    turnLabel,
    nextHeroId: candidates.find((e) => e.side === "hero")?.id ?? null,
    nextMonsterId: candidates.find((e) => e.side === "monster")?.id ?? null,
    roomCardId: game.dungeon?.roomCards?.active?.cardId ?? null,
    initiativeRevealed: revealed,
    light: battle.light,
    round: turnCtx.round,
    actionsRemaining: turnCtx.actionsRemaining,
    turnActorId: turnCtx.turnActorId ?? "",
    initiativeDeckHero: heroCards,
    initiativeDeckMonster: monsterCards,
    ...(game.dungeon?.gold !== undefined ? { gold: game.dungeon.gold } : {}),
  };
}

/** 从 `GameState` 投影左栏英雄与战斗元数据（只读；其余世界区仍可由 mock 填充）。 */
export function adaptGameStateToTabletopWorld(
  game: GameState,
  options?: AdaptGameStateOptions,
): TabletopWorldAdaptation | null {
  if (game.battle) {
    return {
      heroes: projectBattleHeroes(game, options),
      monsters: projectBattleMonsters(game),
      battle: projectBattleMeta(game, options),
    };
  }
  if (game.dungeon?.heroes?.length) {
    return {
      heroes: projectDungeonHeroes(game, options),
      battle: projectBattleMeta(game, options),
    };
  }
  return null;
}
