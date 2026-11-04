import type { SkillStance } from "../hero-skill";
import { rejectBattleCommand } from "../battle";
import type { BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { selectMonsterSkill } from "../monster-stance";
import { applyAncestor1PerfectReplication } from "./ancestor1-perfect-replication";
import { applyAncestor1ImperfectReproduction } from "./ancestor1-imperfect-reproduction";
import { ANCESTOR_1_MONSTER_CARD_ID, applyAncestor1TimeHealsAll } from "./ancestor1-time-heals-all";
import { readFinalFormSequence } from "./final-form-sequence";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function ancestor1Fighting(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor1" && sequence.progress.status === "fighting";
}

/**
 * boss_ability:p034：姿态轨全满时用 Time Heals All，否则用 Replication 直到填满。
 * 占位按存活怪物（含 Reflections）计算；两格大怪占用相邻两格。
 */
function occupiedMonsterStanceIndexes(battle: BattleState): Set<number> {
  const occupied = new Set<number>();
  for (const entity of battle.entities) {
    if (entity.side !== "monster" || entity.dead) continue;
    const start = STANCES.indexOf(entity.stance!);
    if (start < 0) continue;
    const width = entity.stanceSlots ?? 1;
    for (let slot = start; slot < start + width; slot += 1) occupied.add(slot);
  }
  return occupied;
}

/** 最终战 Ancestor 1 怪物回合：由本模块接管选招，不落回通用 `playMonsterSkill`。 */
export function ancestor1SkillAiShouldReplacePrepare(state: GameState, actorId: string): boolean {
  if (!ancestor1Fighting(state)) return false;
  const actor = state.battle?.entities.find((entity) => entity.id === actorId);
  return (
    actor?.side === "monster" && !actor.dead && actor.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID
  );
}

function applyReplicationBySlot(state: GameState, actorId: string, skillSlot: number): ApplyResult {
  if (skillSlot === 1) return applyAncestor1PerfectReplication(state, actorId);
  if (skillSlot === 2) return applyAncestor1ImperfectReproduction(state, actorId);
  return rejectBattleCommand(
    state,
    `Ancestor 1 姿态选招 slot ${skillSlot} 不在 Replication 两招（1–2；boss_ability:p034 / R-048）`,
  );
}

/**
 * `prepareMonsterAction` 专用：
 * - 姿态轨 4 格全满 → `Time Heals All`（slot 3，无选招骰）；
 * - 未满 → 按 `monster_medium:p105` 已核实 `stanceGroups` 掷 d10 选 slot 1/2，
 *   调用 Perfect Replication / Imperfect Reproduction（含 `finishTurn` 与先攻洗入）。
 */
export function applyAncestor1SkillFromStanceSelection(
  state: GameState,
  actorId: string,
): ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(state, "Ancestor 1 选招 AI 须在怪物回合执行");
  if (battle.monsterAction) return rejectBattleCommand(state, "已保存本回合选招，不能重新掷骰");
  const actor = battle.entities.find((entry) => entry.id === actorId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    !card ||
    actor.monsterCardId !== ANCESTOR_1_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "Ancestor 1 或战斗目录不可用（R-048）");
  if (!ancestor1Fighting(state))
    return rejectBattleCommand(state, "Ancestor 1 选招 AI 仅适用于最终战 ancestor1 形态");

  if (occupiedMonsterStanceIndexes(battle).size >= STANCES.length) {
    const healed = applyAncestor1TimeHealsAll(state, actorId);
    if (healed.events.some((event) => event.type === "commandRefused")) return healed;
    return {
      ...healed,
      events: [
        {
          type: "dungeonUpdated",
          message: "Ancestor 1 · 姿态轨全满 → Time Heals All（slot 3；boss_ability:p034）",
        },
        ...healed.events,
      ],
    };
  }

  const position = STANCES.indexOf(actor.stance!);
  if (position < 0 || (actor.stanceSlots !== 1 && actor.stanceSlots !== 2))
    return rejectBattleCommand(state, "缺少已核实的怪物姿态 / 占格数（R-048）");
  const occupied = STANCES.slice(position, position + actor.stanceSlots);

  let pick = selectMonsterSkill(card, occupied);
  let needsRoll = false;
  if (pick.status === "refused") return rejectBattleCommand(state, pick.reason);
  if (pick.status === "needsRoll") {
    needsRoll = true;
    pick = selectMonsterSkill(card, occupied, nextBattleRoll(state.seed, battle.rngCursor));
  }
  if (pick.status !== "selected")
    return rejectBattleCommand(state, pick.status === "refused" ? pick.reason : "选招骰表无效");

  const rolledState: GameState = {
    ...state,
    battle: { ...battle, rngCursor: battle.rngCursor + (needsRoll ? 1 : 0) },
  };
  const played = applyReplicationBySlot(rolledState, actorId, pick.skillSlot);
  if (played.events.some((event) => event.type === "commandRefused")) return played;
  const rollNote = pick.roll === null ? "固定选招" : `选招 d10=${pick.roll}`;
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 1 · 姿态选招：${rollNote} → ${
          pick.skillSlot === 1 ? "Perfect Replication" : "Imperfect Reproduction"
        }（slot ${pick.skillSlot}；boss_ability:p034）`,
      },
      ...played.events,
    ],
  };
}
