import poolFile from "../../../data/normalized/corebox/darkest_monster_pool.json";
import { darkestMonsterPoolFileSchema } from "../../../data/src/darkest-monster-pool";
import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { createRng } from "../rng";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import {
  GESTATING_HEART_MONSTER_CARD_ID,
} from "./gestating-heart-ichor";
import { readFinalFormSequence } from "./final-form-sequence";

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

const DARKEST_SUMMON_POOL = darkestMonsterPoolFileSchema.parse(poolFile).cards;
/** 按 combatCardId 字典序固定，供 `battle.rngCursor` 可复现抽选（R-048）。 */
const DARKEST_SUMMON_POOL_CARD_IDS = [...DARKEST_SUMMON_POOL.map((card) => card.combatCardId)].sort(
  (a, b) => a.localeCompare(b),
);

function summonActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "gestatingHeart" && sequence.progress.status === "fighting";
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function gestatingHeartActor(
  state: GameState,
  actorId: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!summonActive(state))
    return rejectBattleCommand(state, "Summon 仅适用于最终战 Gestating Heart 形态（boss_ability:p036）");
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      "Summon 须于 Gestating Heart 怪物回合执行（boss_ability:p036）",
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== GESTATING_HEART_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, "仅 Gestating Heart 实体可执行 Summon（R-048）");
  return { battle, actor };
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
  if (fromBattle) return fromBattle as MonsterCardView & { readonly dodge?: number; readonly life?: number };
  return state.dungeon?.battleCatalog?.monsters.find((entry) => entry.id === cardId) as
    | (MonsterCardView & { readonly dodge?: number; readonly life?: number })
    | undefined;
}

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function readPoolStanceSlots(cardId: string): 1 | 2 {
  const entry = DARKEST_SUMMON_POOL.find((card) => card.combatCardId === cardId);
  return entry?.stanceSlots ?? 1;
}

function summonablePoolCardIds(
  state: GameState,
  battle: BattleState,
): readonly string[] {
  return DARKEST_SUMMON_POOL_CARD_IDS.filter((cardId) => {
    const card = readMonsterCard(state, battle, cardId);
    if (!card || !Number.isInteger(card.life) || card.life < 1) return false;
    return readMonsterDodge(card) !== undefined;
  });
}

function pickRandomDarkestMonsterCardId(
  state: GameState,
  battle: BattleState,
): { readonly cardId: string; readonly rngCursor: number } | { readonly error: string } {
  const eligible = summonablePoolCardIds(state, battle);
  if (!eligible.length)
    return {
      error:
        "Summon：最暗怪物牌池无可用 Life/Dodge 目录项（darkest_monster_pool.json + battleCatalog；R-048）",
    };
  const rng = createRng(state.seed);
  for (let index = 0; index < battle.rngCursor; index += 1) rng.next();
  const pick = Math.floor(rng.next() * eligible.length);
  return { cardId: eligible[pick]!, rngCursor: battle.rngCursor + 1 };
}

/**
 * boss_ability:p036 第二句：随机召唤一只最暗地牢怪物到下一可用姿态位。
 * 随机源：`darkest_monster_pool.json` 九身份 + 战斗 `rngCursor`（最终战无独立 26 堆；R-048）。
 * 同 cardId 已在场仍允许再召唤（卡面 random；引擎无唯一约束）。
 */
export function applyGestatingHeartSummon(state: GameState, actorId: string): ApplyResult {
  const resolved = gestatingHeartActor(state, actorId);
  if ("events" in resolved) return resolved;
  const { battle } = resolved;

  const occupied = occupiedMonsterStanceIndexes(battle);
  const picked = pickRandomDarkestMonsterCardId(state, battle);
  if ("error" in picked) return rejectBattleCommand(state, picked.error);

  const stanceSlots = readPoolStanceSlots(picked.cardId);
  const stance = pickOpenMonsterStance(occupied, stanceSlots);
  if (!stance)
    return rejectBattleCommand(
      state,
      "Summon：无可用怪物姿态占位（final-monster-* 占位；R-048）",
    );

  const card = readMonsterCard(state, battle, picked.cardId);
  if (!card || !Number.isInteger(card.life) || card.life < 1)
    return rejectBattleCommand(state, `${picked.cardId} 缺少 Life 或战斗目录条目（R-048）`);
  const dodge = readMonsterDodge(card);
  if (dodge === undefined)
    return rejectBattleCommand(state, `${picked.cardId} 缺少已核实 Dodge，保留 hold（R-048）`);

  const entity: BattleEntity = {
    id: `gestating-summon:${picked.cardId}:${battle.choiceCursor}`,
    side: "monster",
    hero: null,
    monsterCardId: picked.cardId,
    life: card.life,
    dodge,
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS[stance],
    stance,
    stanceSlots,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(card.innateProtection === undefined
      ? {}
      : { innateProtection: card.innateProtection, protection: card.innateProtection }),
  };

  const nextBattle = {
    ...battle,
    entities: [...battle.entities, entity],
    rngCursor: picked.rngCursor,
    choiceCursor: battle.choiceCursor + 1,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Gestating Heart · Summon：随机召唤 ${picked.cardId} → ${stance}（boss_ability:p036；darkest_monster_pool + rngCursor；先攻洗入 hold）`,
    },
  ]);
}

export type ApplyGestatingHeartSummonCommand = {
  readonly type: "applyGestatingHeartSummon";
  readonly actorId: string;
};
