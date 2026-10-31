import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { readFinalFormSequence } from "./final-form-sequence";

export const ANCESTOR_1_MONSTER_CARD_ID = "monster_medium:p105";
/** `monster_medium:p105` slot 3 · Time Heals All（R-048：效果线 heal 10）。 */
export const TIME_HEALS_ALL_SKILL_SLOT = 3;
export const TIME_HEALS_ALL_HEAL_AMOUNT = 10;

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function ancestor1Active(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor1" && sequence.progress.status === "fighting";
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function occupiedMonsterStanceIndexes(battle: BattleState): Set<number> {
  const occupied = new Set<number>();
  for (const entity of livingMonsters(battle)) {
    const start = STANCE_ORDER.indexOf(entity.stance!);
    if (start < 0) continue;
    const width = entity.stanceSlots ?? 1;
    for (let slot = start; slot < start + width; slot += 1) occupied.add(slot);
  }
  return occupied;
}

function allMonsterStanceSlotsOccupied(battle: BattleState): boolean {
  const occupied = occupiedMonsterStanceIndexes(battle);
  return STANCE_ORDER.every((_, index) => occupied.has(index));
}

function ancestor1Actor(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!ancestor1Active(state))
    return rejectBattleCommand(
      state,
      "Time Heals All 仅适用于最终战 Ancestor 1 形态（boss_ability:p034）",
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Time Heals All 须于 Ancestor 1 怪物回合执行（boss_ability:p034）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ANCESTOR_1_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Ancestor 1 实体可执行 Time Heals All（R-048）");
  if (!allMonsterStanceSlotsOccupied(battle))
    return rejectBattleCommand(
      state,
      "Time Heals All：怪物姿态轨须全部占用（boss_ability:p034；final-monster-* 占位）",
    );
  return { battle, actor };
}

function selectMostWoundedAlly(
  state: GameState,
  battle: BattleState,
  actor: BattleEntity,
): { readonly targetId: string } | ApplyResult {
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card) return rejectBattleCommand(state, "Ancestor 1 战斗目录缺失（R-048）");
  const allies: MonsterTargetHero[] = [];
  for (const monster of livingMonsters(battle)) {
    if (
      !battle.areas.some((area) => area.id === actor.areaId) ||
      !battle.areas.some((area) => area.id === monster.areaId)
    )
      return rejectBattleCommand(state, "怪物区域不在已核实几何内（R-048）");
    allies.push({
      id: monster.id,
      areaId: monster.areaId,
      stance: monster.stance!,
      areaDistance: distance(battle.areas, actor.areaId, monster.areaId),
      wounds: monster.wounds,
      stress: 0,
      markStacks: 0,
      guard: false,
      dead: monster.dead,
    });
  }
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    TIME_HEALS_ALL_SKILL_SLOT,
    allies,
  );
  if (picked.status === "refused") return rejectBattleCommand(state, picked.reason);
  if (picked.status === "noFiniteTarget")
    return rejectBattleCommand(state, "Time Heals All：无 Most Wounded 友方目标（R-048）");
  return { targetId: picked.targetId };
}

/**
 * boss_ability:p034：姿态轨全满时 Ancestor 使用 Time Heals All（slot 3）。
 * 目标：卡面 Most Wounded 存活友方怪物；治疗量 heal 10（`monster_medium:p105` 效果线）。
 * 目标选择复用 `selectMonsterTarget`（与 Collected Vestal 友方分支相同；不含 Guard/Mark 英雄规则）。
 */
export function applyAncestor1TimeHealsAll(state: GameState, actorId: string): ApplyResult {
  const resolved = ancestor1Actor(state, actorId);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;

  const targetPick = selectMostWoundedAlly(state, battle, actor);
  if ("events" in targetPick) return targetPick;

  const target = battle.entities.find((entity) => entity.id === targetPick.targetId);
  if (!target || target.dead || target.side !== "monster" || target.life === undefined)
    return rejectBattleCommand(state, "Time Heals All 目标无效（R-048）");

  const wounds = Math.max(0, target.wounds - TIME_HEALS_ALL_HEAL_AMOUNT);
  const entities = battle.entities.map((entity) =>
    entity.id === target.id ? { ...entity, wounds } : entity,
  );

  const nextBattle = {
    ...battle,
    entities,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Ancestor 1 · Time Heals All：${target.id} 治疗 ${TIME_HEALS_ALL_HEAL_AMOUNT}（Most Wounded；boss_ability:p034；先攻洗入 hold）`,
    },
  ]);
}

export type ApplyAncestor1TimeHealsAllCommand = {
  readonly type: "applyAncestor1TimeHealsAll";
  readonly actorId: string;
};
