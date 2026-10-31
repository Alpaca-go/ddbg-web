import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { readBossCombatEntry } from "./combat-entry";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
} from "./darkest-mid-boss-scripts";
import {
  DARKEST_MID_BOSS_MONSTER_STANCE_AREAS,
} from "./darkest-shuffling-horror-combat-runtime";
import { getBossScript } from "./registry";

export const MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID = "monster_large:p016" as const;
export const MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID = "monster_medium:p104" as const;

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

export function isMammothCystMidBossBattle(state: GameState): boolean {
  return resolveEncounterBossScriptId(state) === DARKEST_MAMMOTH_CYST_SCRIPT_ID;
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function mammothCystActor(
  state: GameState,
  actorId: string,
  skillLabel: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  if (!isMammothCystMidBossBattle(state))
    return rejectBattleCommand(state, `${skillLabel} 仅适用于 Mammoth Cyst 最暗中途 Boss 战（R-048）`);
  const script = getBossScript(DARKEST_MAMMOTH_CYST_SCRIPT_ID);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry || entry.combatMonsterCardId !== MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID)
    return rejectBattleCommand(state, "Mammoth Cyst 战斗入口未声明（R-048）");
  const turn = battle.encounter?.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 须于 Mammoth Cyst 怪物回合执行（boss_ability:p030）`,
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, `仅 Mammoth Cyst 实体可执行 ${skillLabel}（R-048）`);
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

function readMonsterSpawnMeta(
  state: GameState,
  battle: BattleState,
  cardId: string,
): { readonly stanceSlots: 1 | 2 } | undefined {
  const card = readMonsterCard(state, battle, cardId);
  const tags = card?.type_position_tags;
  if (!tags?.length) return undefined;
  return { stanceSlots: tags.includes("Large") ? 2 : 1 };
}

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function whiteCellStalkInPlay(battle: BattleState): boolean {
  return livingMonsters(battle).some(
    (entity) => entity.monsterCardId === MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
  );
}

/** boss_ability:p030：场上无 White Cell Stalk 时召唤一只，代替本回合 Skill。 */
export function applyMammothCystSummonWhiteCell(state: GameState, actorId: string): ApplyResult {
  const resolved = mammothCystActor(state, actorId, "Summon White Cell Stalk");
  if ("events" in resolved) return resolved;
  const { battle } = resolved;
  if (whiteCellStalkInPlay(battle))
    return rejectBattleCommand(
      state,
      "Summon White Cell Stalk：场上已有 White Cell Stalk，instead of using a Skill 不适用（boss_ability:p030）",
    );

  const cardId = MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID;
  const meta = readMonsterSpawnMeta(state, battle, cardId);
  if (!meta)
    return rejectBattleCommand(state, `${cardId} 缺少目录占格，不能伪造召唤（R-048）`);
  const occupied = occupiedMonsterStanceIndexes(battle);
  const stance = pickOpenMonsterStance(occupied, meta.stanceSlots);
  if (!stance)
    return rejectBattleCommand(
      state,
      "Summon White Cell Stalk：无可用怪物姿态占位（darkest-mid-boss-* 占位；R-048）",
    );
  const card = readMonsterCard(state, battle, cardId);
  if (!card || !Number.isInteger(card.life) || card.life < 1)
    return rejectBattleCommand(state, `${cardId} 缺少 Life 或战斗目录条目（R-048）`);
  const dodge = readMonsterDodge(card);
  if (dodge === undefined)
    return rejectBattleCommand(state, `${cardId} 缺少已核实 Dodge，保留 hold（R-048）`);

  const entity: BattleEntity = {
    id: `mammoth-summon:${cardId}:${battle.choiceCursor}`,
    side: "monster",
    hero: null,
    monsterCardId: cardId,
    life: card.life,
    dodge,
    areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS[stance],
    stance,
    stanceSlots: meta.stanceSlots,
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
    choiceCursor: battle.choiceCursor + 1,
    monsterAction: null,
  };
  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Mammoth Cyst · Summon White Cell Stalk：召唤 ${cardId}（boss_ability:p030；占位区域 / combatReady 仍 hold）`,
    },
  ]);
}

export type ApplyMammothCystSummonWhiteCellCommand = {
  readonly type: "applyMammothCystSummonWhiteCell";
  readonly actorId: string;
};
