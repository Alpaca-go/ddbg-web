import supportFile from "../../../data/normalized/corebox/absolute_nothingness_support.json";
import {
  absoluteNothingnessSupportSchema,
  readAbsoluteNothingnessSupport,
} from "../../../data/src/absolute-nothingness-support";
import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { FINAL_BATTLE_MONSTER_STANCE_AREAS } from "./final-battle-deploy";
import { readFinalFormSequence } from "./final-form-sequence";

/** 无印刷战斗卡时的稳定合成 id（`absolute_nothingness_support.json` / Q-AN-001）。 */
export const ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID = "support:absolute_nothingness" as const;

/** Kyries 批准采用 DD wiki 数值（非印刷卡；见 phase5 运行时文档）。 */
export const ABSOLUTE_NOTHINGNESS_LIFE = 999;
export const ABSOLUTE_NOTHINGNESS_DODGE = 999;

const SUPPORT = readAbsoluteNothingnessSupport(absoluteNothingnessSupportSchema.parse(supportFile));

type NothingnessPlacement = (typeof SUPPORT.placements)[number];

const PLACEMENT_STANCE: Record<NothingnessPlacement, SkillStance> = {
  monster_defense: "defensive",
  monster_ranged: "ranged",
  monster_support: "support",
};

export function isAbsoluteNothingnessMonsterCardId(
  cardId: string | undefined,
): cardId is typeof ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID {
  return cardId === ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID;
}

export function isAbsoluteNothingnessEntity(entity: BattleEntity): boolean {
  return entity.side === "monster" && isAbsoluteNothingnessMonsterCardId(entity.monsterCardId);
}

export function absoluteNothingnessTargetRefusal(target: BattleEntity | undefined): string | null {
  if (target && isAbsoluteNothingnessEntity(target))
    return "Absolute Nothingness 不可被选为目标（boss_ability:p035）";
  return null;
}

/** 合成目录卡：Life 与 wiki 一致；`Cosmic` 写入 `type_position_tags`（无独立 type 字段）。 */
export function absoluteNothingnessSyntheticMonsterCard(): MonsterCardView {
  return {
    id: ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID,
    life: ABSOLUTE_NOTHINGNESS_LIFE,
    verification: { unverified: true },
    skills: [],
    type_position_tags: ["Cosmic"],
  };
}

export function ensureAbsoluteNothingnessMonsterCatalog(
  monsters: readonly MonsterCardView[] | undefined,
): readonly MonsterCardView[] {
  const list = monsters ?? [];
  if (list.some((entry) => entry.id === ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID)) return list;
  return [...list, absoluteNothingnessSyntheticMonsterCard()];
}

function ancestor2FormActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor2" && sequence.progress.status === "fighting";
}

function livingMonsters(battle: BattleState): BattleEntity[] {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function monsterAreaOpen(battle: BattleState, stance: SkillStance): boolean {
  const areaId = FINAL_BATTLE_MONSTER_STANCE_AREAS[stance];
  return !livingMonsters(battle).some((entity) => entity.areaId === areaId);
}

function entityIdForPlacement(placement: NothingnessPlacement): string {
  return `final-ancestor2-${placement.replace("monster_", "absolute-nothingness-")}`;
}

function buildNothingnessEntity(
  placement: NothingnessPlacement,
  battle: BattleState,
): BattleEntity | undefined {
  const stance = PLACEMENT_STANCE[placement];
  if (!monsterAreaOpen(battle, stance)) return undefined;
  return {
    id: entityIdForPlacement(placement),
    side: "monster",
    hero: null,
    monsterCardId: ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID,
    life: ABSOLUTE_NOTHINGNESS_LIFE,
    dodge: ABSOLUTE_NOTHINGNESS_DODGE,
    areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS[stance],
    stance,
    stanceSlots: 1,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    untargetable: true,
    bleed: [],
    blight: [],
  };
}

/**
 * boss_ability:p035：按 `absolute_nothingness_support.json` 固定落位（防御 / 远程 / 支援各 1），
 * 以占位 areaId 是否已有怪物为准；区域已满则跳过（可部分部署）。不使用 Gestating Heart 随机池 RNG。
 */
export function appendAbsoluteNothingnessSupportEntities(battle: BattleState): {
  readonly entities: readonly BattleEntity[];
  readonly monsters: readonly MonsterCardView[];
  readonly placed: readonly NothingnessPlacement[];
} {
  let nextBattle = battle;
  const placed: NothingnessPlacement[] = [];
  for (const placement of SUPPORT.placements) {
    if (
      nextBattle.entities.some(
        (entity) => !entity.dead && entity.id === entityIdForPlacement(placement),
      )
    )
      continue;
    if (
      livingMonsters(nextBattle).filter(isAbsoluteNothingnessEntity).length >=
      SUPPORT.miniatureCount
    )
      break;
    const entity = buildNothingnessEntity(placement, nextBattle);
    if (!entity) continue;
    nextBattle = { ...nextBattle, entities: [...nextBattle.entities, entity] };
    placed.push(placement);
  }
  return {
    entities: nextBattle.entities,
    monsters: ensureAbsoluteNothingnessMonsterCatalog(nextBattle.monsters),
    placed,
  };
}

/** 形态部署 / 显式命令：Ancestor 2 fighting 下写入最多 3 枚占位实体。 */
export function applyAncestor2DeployAbsoluteNothingness(state: GameState): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  if (!ancestor2FormActive(state))
    return rejectBattleCommand(
      state,
      "Absolute Nothingness 部署仅适用于最终战 Ancestor 2 形态 fighting（boss_ability:p035）",
    );
  const { entities, monsters, placed } = appendAbsoluteNothingnessSupportEntities(battle);
  if (!placed.length)
    return rejectBattleCommand(
      state,
      "Absolute Nothingness：无可用怪物姿态位或已全部部署（final-monster-*；R-048）",
    );
  return {
    state: {
      ...state,
      battle: { ...battle, entities, monsters },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 2 · Absolute Nothingness：部署 ${placed.length}/${SUPPORT.miniatureCount}（${placed.join("、")}；wiki HP/Dodge 999；untargetable；boss_ability:p035）`,
      },
    ],
  };
}

export type ApplyAncestor2DeployAbsoluteNothingnessCommand = {
  readonly type: "applyAncestor2DeployAbsoluteNothingness";
};
