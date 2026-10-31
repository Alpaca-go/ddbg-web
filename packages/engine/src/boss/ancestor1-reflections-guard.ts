import type { BattleEntity } from "../battle";
import type { GameState } from "../command";
import { readFinalFormSequence } from "./final-form-sequence";

export const PERFECT_REFLECTION_MONSTER_CARD_ID = "monster_medium:p106";
export const IMPERFECT_REFLECTION_MONSTER_CARD_ID = "monster_medium:p109";

/** boss_ability:p034 · Reflections 支援卡（Perfect / Imperfect）。 */
export function isAncestor1ReflectionMonsterCardId(
  cardId: string | null | undefined,
): cardId is
  typeof PERFECT_REFLECTION_MONSTER_CARD_ID | typeof IMPERFECT_REFLECTION_MONSTER_CARD_ID {
  return (
    cardId === PERFECT_REFLECTION_MONSTER_CARD_ID || cardId === IMPERFECT_REFLECTION_MONSTER_CARD_ID
  );
}

export function ancestor1ReflectionsGuardActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor1" && sequence.progress.status === "fighting";
}

/** 存活 Reflection 须保持 `guard: true`；空 `statusStacks` 避免 R-048 无 duration 守卫拦截 startBattle。 */
export function withAncestor1ReflectionsGuardEntities(
  state: GameState,
  entities: readonly BattleEntity[],
): readonly BattleEntity[] {
  if (!ancestor1ReflectionsGuardActive(state)) return entities;
  let changed = false;
  const next = entities.map((entity) => {
    if (
      entity.side !== "monster" ||
      entity.dead ||
      !isAncestor1ReflectionMonsterCardId(entity.monsterCardId) ||
      (entity.guard && entity.statusStacks !== undefined)
    )
      return entity;
    changed = true;
    return { ...entity, guard: true, statusStacks: entity.statusStacks ?? [] };
  });
  return changed ? next : entities;
}

export function withAncestor1ReflectionsGuardState(state: GameState): GameState {
  const battle = state.battle;
  if (!battle) return state;
  const entities = withAncestor1ReflectionsGuardEntities(state, battle.entities);
  if (entities === battle.entities) return state;
  return { ...state, battle: { ...battle, entities } };
}
