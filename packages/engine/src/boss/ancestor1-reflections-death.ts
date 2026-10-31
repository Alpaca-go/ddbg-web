import type { ApplyResult } from "../command";
import { IMPERFECT_REFLECTION_MONSTER_CARD_ID } from "./ancestor1-reflections-guard";
import { readFinalFormSequence } from "./final-form-sequence";

const ANCESTOR_1_CARD = "monster_medium:p105";
/** boss_ability:p034 Reflections 卡面明文。 */
const IMPERFECT_DEATH_ANCESTOR_WOUNDS = 10;

/** boss_ability:p034 Reflections：Imperfect Reflection 死亡时存活 Ancestor 1 承受 10 伤口。 */
export function applyAncestor1ImperfectReflectionDeath(
  result: ApplyResult,
  ids: readonly string[],
): { readonly result: ApplyResult; readonly ids: readonly string[] } {
  const sequence = readFinalFormSequence(result.state);
  if (
    !sequence?.current ||
    sequence.current.id !== "ancestor1" ||
    sequence.progress.status !== "fighting"
  )
    return { result, ids };

  const battle = result.state.battle!;
  const imperfectDied = battle.entities.some(
    (entity) =>
      entity.side === "monster" &&
      entity.monsterCardId === IMPERFECT_REFLECTION_MONSTER_CARD_ID &&
      entity.dead &&
      ids.includes(entity.id),
  );
  if (!imperfectDied) return { result, ids };

  const ancestor = battle.entities.find(
    (entity) =>
      entity.side === "monster" && entity.monsterCardId === ANCESTOR_1_CARD && !entity.dead,
  );
  if (!ancestor || ancestor.life === undefined) return { result, ids };

  const wounds = ancestor.wounds + IMPERFECT_DEATH_ANCESTOR_WOUNDS;
  if (!Number.isSafeInteger(wounds)) return { result, ids };
  const updated: typeof ancestor = {
    ...ancestor,
    wounds,
    dead: wounds >= ancestor.life,
  };

  return {
    ids: updated.dead ? [...ids, ancestor.id] : ids,
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...battle,
          entities: battle.entities.map((entity) => (entity.id === ancestor.id ? updated : entity)),
        },
      },
      events: [
        ...result.events,
        {
          type: "dungeonUpdated" as const,
          message:
            "Reflections：Imperfect Reflection 被消灭，Ancestor 1 承受 10 伤口（boss_ability:p034）",
        },
      ],
    },
  };
}
