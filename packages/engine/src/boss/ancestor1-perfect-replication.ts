import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import {
  PERFECT_REFLECTION_MONSTER_CARD_ID,
  withAncestor1ReflectionsGuardState,
} from "./ancestor1-reflections-guard";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { readFinalFormSequence } from "./final-form-sequence";

/** `monster_medium:p105` slot 1 · Perfect Replication（R-048：效果线 light −1 + summon Perfect Reflection）。 */
export const PERFECT_REPLICATION_SKILL_SLOT = 1;
export const PERFECT_REPLICATION_SUMMON_CARD_ID = PERFECT_REFLECTION_MONSTER_CARD_ID;
export const PERFECT_REPLICATION_LIGHT_DELTA = -1;

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

function pickOpenMonsterStance(occupied: Set<number>, width: 1 | 2): SkillStance | undefined {
  for (const stance of STANCE_ORDER) {
    const start = STANCE_ORDER.indexOf(stance);
    if (start + width > STANCE_ORDER.length) continue;
    let fits = true;
    for (let slot = start; slot < start + width; slot += 1) {
      if (occupied.has(slot)) fits = false;
    }
    if (fits) return stance;
  }
  return undefined;
}

function readMonsterCard(
  state: GameState,
  battle: BattleState,
  cardId: string,
): (MonsterCardView & { readonly dodge?: number; readonly life?: number }) | undefined {
  const fromBattle = battle.monsters?.find((entry) => entry.id === cardId);
  if (fromBattle)
    return fromBattle as MonsterCardView & { readonly dodge?: number; readonly life?: number };
  return state.dungeon?.battleCatalog?.monsters.find((entry) => entry.id === cardId) as
    (MonsterCardView & { readonly dodge?: number; readonly life?: number }) | undefined;
}

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function readMonsterStanceSlots(card: MonsterCardView): 1 | 2 {
  return card.id.startsWith("monster_large:") ? 2 : 1;
}

function clampBattleLight(light: number): number {
  return Math.max(0, Math.min(5, light + PERFECT_REPLICATION_LIGHT_DELTA));
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
      "Perfect Replication 仅适用于最终战 Ancestor 1 形态（boss_ability:p034）",
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Perfect Replication 须于 Ancestor 1 怪物回合执行（boss_ability:p034）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ANCESTOR_1_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Ancestor 1 实体可执行 Perfect Replication（R-048）");
  const occupied = occupiedMonsterStanceIndexes(battle);
  if (!pickOpenMonsterStance(occupied, 1))
    return rejectBattleCommand(
      state,
      "Perfect Replication：无可用怪物姿态占位（满槽应走 Time Heals All；boss_ability:p034）",
    );
  return { battle, actor };
}

/**
 * boss_ability:p034：姿态轨有空槽时 Ancestor 使用 Perfect Replication（slot 1）。
 * 效果线：战斗 Torch（`battle.light`）−1（钳制 0–5）；召唤 Perfect Reflection 到下一空姿态位。
 * 同 cardId 已在场仍允许再召唤（卡面未声明唯一；R-048）。
 */
export function applyAncestor1PerfectReplication(state: GameState, actorId: string): ApplyResult {
  const resolved = ancestor1Actor(state, actorId);
  if ("events" in resolved) return resolved;
  const { battle } = resolved;

  const cardId = PERFECT_REPLICATION_SUMMON_CARD_ID;
  const card = readMonsterCard(state, battle, cardId);
  if (!card || !Number.isInteger(card.life) || card.life < 1)
    return rejectBattleCommand(state, `${cardId} 缺少 Life 或战斗目录条目（R-048）`);
  const dodge = readMonsterDodge(card);
  if (dodge === undefined)
    return rejectBattleCommand(state, `${cardId} 缺少已核实 Dodge，保留 hold（R-048）`);

  const stanceSlots = readMonsterStanceSlots(card);
  const stance = pickOpenMonsterStance(occupiedMonsterStanceIndexes(battle), stanceSlots);
  if (!stance)
    return rejectBattleCommand(
      state,
      "Perfect Replication：无可用怪物姿态占位（final-monster-* 占位；R-048）",
    );

  const entity: BattleEntity = {
    id: `ancestor1-perfect-replication:${cardId}:${battle.choiceCursor}`,
    side: "monster",
    hero: null,
    monsterCardId: cardId,
    life: card.life,
    dodge,
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS[stance],
    stance,
    stanceSlots,
    wounds: 0,
    skillIds: [],
    guard: true,
    dead: false,
    bleed: [],
    blight: [],
    statusStacks: [],
    ...(card.innateProtection === undefined
      ? {}
      : { innateProtection: card.innateProtection, protection: card.innateProtection }),
  };

  const light = clampBattleLight(battle.light);
  const nextBattle = {
    ...battle,
    light,
    entities: [...battle.entities, entity],
    choiceCursor: battle.choiceCursor + 1,
    monsterAction: null,
  };
  const guarded = withAncestor1ReflectionsGuardState({ ...state, battle: nextBattle });
  return finishTurn(guarded, actorId, [
    {
      type: "dungeonUpdated",
      message: `Ancestor 1 · Perfect Replication：Torch ${PERFECT_REPLICATION_LIGHT_DELTA}（${light}）；召唤 ${cardId} → ${stance}（#448 Guard；boss_ability:p034；先攻洗入 hold）`,
    },
  ]);
}

export type ApplyAncestor1PerfectReplicationCommand = {
  readonly type: "applyAncestor1PerfectReplication";
  readonly actorId: string;
};
