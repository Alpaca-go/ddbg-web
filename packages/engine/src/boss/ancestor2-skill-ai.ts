import type { SkillStance } from "../hero-skill";
import { rejectBattleCommand } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { selectMonsterSkill } from "../monster-stance";
import {
  applyAncestor2EmbraceFutility,
  applyAncestor2RefashionThem,
  applyAncestor2UnmakeThemAll,
  EMBRACE_FUTILITY_SKILL_SLOT,
  REFASHION_THEM_SKILL_SLOT,
  UNMAKE_THEM_ALL_SKILL_SLOT,
} from "./ancestor2-skills-acc";
import {
  ANCESTOR_2_MONSTER_CARD_ID,
} from "./ancestor2-swift-teleportation";
import { readFinalFormSequence } from "./final-form-sequence";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function ancestor2Fighting(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor2" && sequence.progress.status === "fighting";
}

/** 最终战 Ancestor 2 怪物回合：走卡面姿态选招 + 三招 Acc 显式命令，不经过通用 `playMonsterSkill` 选招路径。 */
export function ancestor2SkillAiShouldReplacePrepare(state: GameState, actorId: string): boolean {
  if (!ancestor2Fighting(state)) return false;
  const actor = state.battle?.entities.find((entity) => entity.id === actorId);
  return (
    actor?.side === "monster" &&
    !actor.dead &&
    actor.monsterCardId === ANCESTOR_2_MONSTER_CARD_ID
  );
}

function skillLabelFromSlot(slot: number): string | null {
  if (slot === REFASHION_THEM_SKILL_SLOT) return "Refashion Them";
  if (slot === UNMAKE_THEM_ALL_SKILL_SLOT) return "Unmake Them All";
  if (slot === EMBRACE_FUTILITY_SKILL_SLOT) return "Embrace Futility";
  return null;
}

function applyAncestor2SkillBySlot(state: GameState, actorId: string, skillSlot: number): ApplyResult {
  if (skillSlot === REFASHION_THEM_SKILL_SLOT) return applyAncestor2RefashionThem(state, actorId);
  if (skillSlot === UNMAKE_THEM_ALL_SKILL_SLOT) return applyAncestor2UnmakeThemAll(state, actorId);
  if (skillSlot === EMBRACE_FUTILITY_SKILL_SLOT) return applyAncestor2EmbraceFutility(state, actorId);
  return rejectBattleCommand(
    state,
    `Ancestor 2 姿态选招 slot ${skillSlot} 非 Acc 三招（1–3；boss_ability:p035 / R-048）`,
  );
}

/**
 * `prepareMonsterAction` 专用：按 `monster_large:p018` 已核实 `stanceGroups` 掷选招骰，
 * 映射 slot 1–3 后调用 #455 Acc 显式命令（含 `finishTurn` 与 Swift Teleportation 钩子）。
 */
export function applyAncestor2SkillFromStanceSelection(
  state: GameState,
  actorId: string,
): ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(state, "Ancestor 2 选招 AI 须在怪物回合执行");
  if (battle.monsterAction) return rejectBattleCommand(state, "已保存本回合选招，不能重新掷骰");
  const actor = battle.entities.find((entry) => entry.id === actorId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    !card ||
    actor.monsterCardId !== ANCESTOR_2_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "Ancestor 2 或战斗目录不可用（R-048）");
  if (!ancestor2Fighting(state))
    return rejectBattleCommand(state, "Ancestor 2 选招 AI 仅适用于最终战 ancestor2 形态");

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
  if (pick.status !== "selected") {
    return rejectBattleCommand(state, pick.status === "refused" ? pick.reason : "选招骰表无效");
  }

  const label = skillLabelFromSlot(pick.skillSlot);
  if (!label)
    return rejectBattleCommand(
      state,
      `Ancestor 2 选招 slot ${pick.skillSlot} 不在 Acc 三招范围（R-048）`,
    );

  const rolledState: GameState = {
    ...state,
    battle: {
      ...battle,
      rngCursor: battle.rngCursor + (needsRoll ? 1 : 0),
    },
  };

  const played = applyAncestor2SkillBySlot(rolledState, actorId, pick.skillSlot);
  if (played.events.some((event) => event.type === "commandRefused")) return played;

  const rollNote =
    pick.roll === null ? "固定选招" : `选招 d10=${pick.roll}`;
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 2 · 姿态选招：${rollNote} → ${label}（slot ${pick.skillSlot}；boss_ability:p035）`,
      },
      ...played.events,
    ],
  };
}
