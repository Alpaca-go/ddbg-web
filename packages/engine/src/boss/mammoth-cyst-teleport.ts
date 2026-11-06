import { rejectBattleCommand } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterSkillResolvedEvent } from "../command";
import { nextBattleRoll } from "../encounter";
import { MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { mammothCystProductionCombatActive } from "./mammoth-cyst-i-deploy";

/** R-195：White Cell Stalk 的 Teleport 技能槽位（FRONT p104；`boss_ability:p031`）。 */
export const WHITE_CELL_TELEPORT_SKILL_SLOT = 3 as const;

/**
 * R-195 / R-164：紫星印刷编号直读为 d10 落点。
 * 1–2→A、3–4→C、5–6→B、7–8→G、9–10→I（图面 A=1–2、C=3–4、B=5–6、G=7–8、I=9–10）。
 */
export function mammothTeleportTargetArea(roll: number): string | null {
  if (!Number.isSafeInteger(roll) || roll < 1 || roll > 10) return null;
  if (roll <= 2) return "A";
  if (roll <= 4) return "C";
  if (roll <= 6) return "B";
  if (roll <= 8) return "G";
  return "I";
}

function areaVacancy(
  battle: NonNullable<GameState["battle"]>,
  areaId: string,
): { readonly free: number; readonly areaExists: boolean } {
  const area = battle.areas.find((a) => a.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return { free: 0, areaExists: false };
  const occupied = battle.entities
    .filter((e) => !e.dead && e.areaId === areaId)
    .reduce((sum, e) => sum + (e.side === "hero" ? 1 : (e.stanceSlots ?? 1)), 0);
  return { free: Math.max(0, area.capacity! - occupied), areaExists: true };
}

/**
 * R-195：White Cell Stalk 的 Teleport 命中英雄后掷 d10，把英雄放进对应紫星区。
 * 只移动区域、不移动姿态轨；落点满员时按 §6.7 位移截断（不移动）；不额外结算尖刺/伤害。
 */
export function chainWhiteCellTeleportAfterMonsterSkill(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  const state = result.state;
  const battle = state.battle!;
  if (!mammothCystProductionCombatActive(state)) return result;
  if (
    resolved.actorDead ||
    resolved.skillSlot !== WHITE_CELL_TELEPORT_SKILL_SLOT ||
    resolved.resolution.outcome === "miss"
  )
    return result;
  const actor = battle.entities.find((e) => e.id === resolved.actorId);
  const target = battle.entities.find((e) => e.id === resolved.resolution.targetId);
  if (
    !actor ||
    actor.dead ||
    actor.monsterCardId !== MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID ||
    !target ||
    target.side !== "hero" ||
    target.dead
  )
    return result;
  const roll = nextBattleRoll(state.seed, battle.rngCursor);
  const areaId = mammothTeleportTargetArea(roll);
  if (!areaId) return rejectBattleCommand(state, "White Cell Teleport d10 无效（R-048）");
  const { free, areaExists } = areaVacancy(battle, areaId);
  if (!areaExists)
    return rejectBattleCommand(state, "White Cell Teleport 紫星区不在几何内（R-048）");
  const alreadyThere = target.areaId === areaId;
  const truncated = !alreadyThere && free < 1;
  const moved =
    alreadyThere || truncated
      ? battle.entities
      : battle.entities.map((e) => (e.id === target.id ? { ...e, areaId } : e));
  const note = alreadyThere
    ? "（已在落点，不移动）"
    : truncated
      ? "（满区，位移截断，不移动）"
      : "";
  return {
    state: {
      ...state,
      battle: { ...battle, entities: moved, rngCursor: battle.rngCursor + 1 },
    },
    events: [
      ...result.events,
      {
        type: "dungeonUpdated",
        message: `White Cell Teleport：d10=${roll}→${areaId}${note}（R-195）`,
      },
    ],
  };
}
