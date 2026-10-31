import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import { createRng } from "../rng";
import { readBossCombatEntry } from "./combat-entry";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import { DARKEST_SHUFFLING_HORROR_SCRIPT_ID } from "./darkest-mid-boss-scripts";

export const SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID = "monster_large:p017" as const;

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

export const DARKEST_MID_BOSS_HERO_STANCE_AREAS: Readonly<Record<SkillStance, string>> = {
  aggressive: "darkest-mid-boss-hero-aggressive",
  defensive: "darkest-mid-boss-hero-defensive",
  ranged: "darkest-mid-boss-hero-ranged",
  support: "darkest-mid-boss-hero-support",
};

export function isShufflingHorrorMidBossBattle(state: GameState): boolean {
  return resolveEncounterBossScriptId(state) === DARKEST_SHUFFLING_HORROR_SCRIPT_ID;
}

function livingHeroes(battle: BattleState): BattleEntity[] {
  return battle.entities
    .filter(
      (entity) =>
        entity.side === "hero" &&
        !entity.dead &&
        entity.stance &&
        STANCE_ORDER.includes(entity.stance),
    )
    .sort(
      (a, b) =>
        STANCE_ORDER.indexOf(a.stance!) - STANCE_ORDER.indexOf(b.stance!) || a.id.localeCompare(b.id),
    );
}

function shufflingHorrorActor(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  if (!isShufflingHorrorMidBossBattle(state))
    return rejectBattleCommand(state, "Undulations 仅适用于 Shuffling Horror 最暗中途 Boss 战（R-048）");
  const script = getBossScript(DARKEST_SHUFFLING_HORROR_SCRIPT_ID);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry || entry.combatMonsterCardId !== SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID)
    return rejectBattleCommand(state, "Shuffling Horror 战斗入口未声明（R-048）");
  const turn = battle.encounter?.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(state, "Undulations 须于 Shuffling Horror 怪物回合执行（boss_ability:p033）");
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Shuffling Horror 实体可执行 Undulations（R-048）");
  return { battle, actor };
}

function shuffleHeroIds(
  seed: number,
  cursor: number,
  heroIds: readonly string[],
): { readonly order: string[]; readonly cursor: number } {
  const order = [...heroIds];
  let nextCursor = cursor;
  for (let i = order.length - 1; i > 0; i -= 1) {
    const rng = createRng(seed);
    for (let index = 0; index < nextCursor; index += 1) rng.next();
    const j = Math.floor(rng.next() * (i + 1));
    nextCursor += 1;
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { order, cursor: nextCursor };
}

/** boss_ability:p033：洗混全部英雄姿态牌，从 front（aggressive）起随机放回。 */
export function applyShufflingHorrorUndulations(state: GameState, actorId: string): ApplyResult {
  const resolved = shufflingHorrorActor(state, actorId);
  if ("events" in resolved) return resolved;
  const { battle } = resolved;
  const heroes = livingHeroes(battle);
  if (!heroes.length)
    return rejectBattleCommand(state, "Undulations：场上无可用英雄姿态（R-048）");
  const { order, cursor } = shuffleHeroIds(
    state.seed,
    battle.rngCursor,
    heroes.map((hero) => hero.id),
  );
  const assignment = new Map<string, { readonly stance: SkillStance; readonly areaId: string }>();
  for (let index = 0; index < order.length; index += 1) {
    const stance = STANCE_ORDER[index]!;
    assignment.set(order[index]!, {
      stance,
      areaId: DARKEST_MID_BOSS_HERO_STANCE_AREAS[stance],
    });
  }
  const entities = battle.entities.map((entity) => {
    const next = assignment.get(entity.id);
    return next ? { ...entity, stance: next.stance, areaId: next.areaId } : entity;
  });
  const nextBattle = {
    ...battle,
    entities,
    rngCursor: cursor,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Shuffling Horror · Undulations：${order.join("→")} 自 front 重排英雄姿态（boss_ability:p033；Echoing / combatReady 仍 hold）`,
    },
  ]);
}

export type ApplyShufflingHorrorUndulationsCommand = {
  readonly type: "applyShufflingHorrorUndulations";
  readonly actorId: string;
};
