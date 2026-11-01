import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { readHeroPassiveDefence } from "../battle-skill-status";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import { insertReflectionInitiative } from "./reflection-initiative";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { applyPassiveHero } from "../passive-runtime";
import { resolveBattlePressure } from "../pressure";
import {
  IMPERFECT_REFLECTION_MONSTER_CARD_ID,
  withAncestor1ReflectionsGuardState,
} from "./ancestor1-reflections-guard";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { readFinalFormSequence } from "./final-form-sequence";

/** `monster_medium:p105` slot 2 · Imperfect Reproduction（R-048：效果线 stress +2 + summon Imperfect Reflection）。 */
export const IMPERFECT_REPRODUCTION_SKILL_SLOT = 2;
export const IMPERFECT_REPRODUCTION_SUMMON_CARD_ID = IMPERFECT_REFLECTION_MONSTER_CARD_ID;
export const IMPERFECT_REPRODUCTION_STRESS_AMOUNT = 2;

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

function ancestor1Actor(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!ancestor1Active(state))
    return rejectBattleCommand(
      state,
      "Imperfect Reproduction 仅适用于最终战 Ancestor 1 形态（boss_ability:p034）",
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Imperfect Reproduction 须于 Ancestor 1 怪物回合执行（boss_ability:p034）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ANCESTOR_1_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Ancestor 1 实体可执行 Imperfect Reproduction（R-048）");
  const occupied = occupiedMonsterStanceIndexes(battle);
  if (!pickOpenMonsterStance(occupied, 1))
    return rejectBattleCommand(
      state,
      "Imperfect Reproduction：无可用怪物姿态占位（满槽应走 Time Heals All；boss_ability:p034）",
    );
  return { battle, actor };
}

function selectMostStressedHero(
  state: GameState,
  battle: BattleState,
  actor: BattleEntity,
): { readonly targetId: string } | ApplyResult {
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card) return rejectBattleCommand(state, "Ancestor 1 战斗目录缺失（R-048）");
  const heroes: MonsterTargetHero[] = [];
  for (const hero of battle.entities.filter((entry) => entry.side === "hero" && !entry.dead)) {
    if (
      !battle.areas.some((area) => area.id === actor.areaId) ||
      !battle.areas.some((area) => area.id === hero.areaId)
    )
      return rejectBattleCommand(state, "角色区域不在已核实几何内（R-048）");
    heroes.push({
      id: hero.id,
      areaId: hero.areaId,
      stance: hero.stance!,
      areaDistance: distance(battle.areas, actor.areaId, hero.areaId),
      wounds: hero.wounds,
      stress: hero.stress!,
      markStacks: hero.markStacks ?? 0,
      guard: hero.guard,
      dead: hero.dead,
    });
  }
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    IMPERFECT_REPRODUCTION_SKILL_SLOT,
    heroes,
  );
  if (picked.status === "refused") return rejectBattleCommand(state, picked.reason);
  if (picked.status === "noFiniteTarget")
    return rejectBattleCommand(state, "Imperfect Reproduction：无 Most Stressed 英雄目标（R-048）");
  return { targetId: picked.targetId };
}

/**
 * boss_ability:p034：姿态轨有空槽时 Ancestor 使用 Imperfect Reproduction（slot 2）。
 * 效果线：Most Stressed 存活英雄 **stress +2**（被动修正经 `applyPassiveHero`）；召唤 Imperfect Reflection（`monster_medium:p109`）。
 * 攻击 Acc/Crit 结算 hold；目标选择复用 `selectMonsterTarget`（R-024 / R-048）。
 */
export function applyAncestor1ImperfectReproduction(
  state: GameState,
  actorId: string,
): ApplyResult {
  const resolved = ancestor1Actor(state, actorId);
  if ("events" in resolved) return resolved;
  let { battle } = resolved;
  const { actor } = resolved;

  const targetPick = selectMostStressedHero(state, battle, actor);
  if ("events" in targetPick) return targetPick;

  const stressTarget = battle.entities.find((entity) => entity.id === targetPick.targetId);
  if (
    !stressTarget ||
    stressTarget.dead ||
    stressTarget.side !== "hero" ||
    stressTarget.stress === undefined
  )
    return rejectBattleCommand(state, "Imperfect Reproduction 压力目标无效（R-048）");

  const stressed = applyPassiveHero(
    stressTarget,
    { type: "stress", amount: IMPERFECT_REPRODUCTION_STRESS_AMOUNT },
    state.seed,
    battle.rngCursor,
    battle.light,
    battle.provisions,
    readHeroPassiveDefence(battle, stressTarget),
  );
  if (stressed.status === "refused") return rejectBattleCommand(state, stressed.reason);

  const entities = battle.entities.map((entity) =>
    entity.id === stressTarget.id ? stressed.hero : entity,
  );
  battle = {
    ...battle,
    entities,
    rngCursor: stressed.cursor,
    ...(battle.provisions ? { provisions: stressed.provisions } : {}),
  };

  const cardId = IMPERFECT_REPRODUCTION_SUMMON_CARD_ID;
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
      "Imperfect Reproduction：无可用怪物姿态占位（final-monster-* 占位；R-048）",
    );

  const entity: BattleEntity = {
    id: `ancestor1-imperfect-reproduction:${cardId}:${battle.choiceCursor}`,
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

  const nextBattle = {
    ...battle,
    entities: [...entities, entity],
    choiceCursor: battle.choiceCursor + 1,
    monsterAction: null,
  };
  const guarded = withAncestor1ReflectionsGuardState({ ...state, battle: nextBattle });
  const pressure = resolveBattlePressure({
    state: guarded,
    events: [
      ...stressed.events,
      {
        type: "dungeonUpdated",
        message: `Ancestor 1 · Imperfect Reproduction：${stressTarget.id} 压力 +${IMPERFECT_REPRODUCTION_STRESS_AMOUNT}（Most Stressed）；召唤 ${cardId} → ${stance}（#448 Guard；boss_ability:p034；当前牌堆洗入1张先攻，R31）`,
      },
    ],
  });
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  return finishTurn(insertReflectionInitiative(pressure.state), actorId, pressure.events);
}

export type ApplyAncestor1ImperfectReproductionCommand = {
  readonly type: "applyAncestor1ImperfectReproduction";
  readonly actorId: string;
};
