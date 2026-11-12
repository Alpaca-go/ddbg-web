import { distance, rejectBattleCommand } from "../../battle";
import type { BattleEntity, BattleState } from "../../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../../command";
import { recordMonsterSkill } from "../../encounter";
import type { MonsterCardView } from "../../monster-skill";
import { insertMonsterInitiative } from "../../boss/monster-initiative";
import { buildWealdMonsterCatalog } from "./monster-catalog";
import { wealdMechanicsActive, wealdPackSelected } from "./weald-mechanics";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

function livingEntities(battle: BattleState) {
  return battle.entities.filter((e) => !e.dead);
}

function occupiedMonsterStanceIndexes(battle: BattleState): Set<number> {
  const occupied = new Set<number>();
  for (const entity of livingEntities(battle).filter((e) => e.side === "monster")) {
    const start = STANCES.indexOf(entity.stance as (typeof STANCES)[number]);
    if (start < 0) continue;
    const width = entity.stanceSlots ?? 1;
    for (let slot = start; slot < start + width; slot += 1) occupied.add(slot);
  }
  return occupied;
}

function pickOpenMonsterStance(
  occupied: Set<number>,
  width: 1 | 2,
): (typeof STANCES)[number] | undefined {
  for (const stance of STANCES) {
    const start = STANCES.indexOf(stance);
    if (start + width > STANCES.length) continue;
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
): MonsterCardView | undefined {
  return (
    battle.monsters?.find((c) => c.id === cardId) ??
    state.dungeon?.battleCatalog?.monsters.find((c) => c.id === cardId)
  );
}

function stanceSlotsFor(card: MonsterCardView): 1 | 2 {
  const tagged = card.type_position_tags?.includes("Large");
  if (tagged) return 2;
  const fromProfile = (card as MonsterCardView & { stanceSlots?: 1 | 2 }).stanceSlots;
  if (fromProfile === 1 || fromProfile === 2) return fromProfile;
  return 1;
}

function readMonsterDodge(card: MonsterCardView & { dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function areaLegalForSummonEnd(state: GameState, areaId: string): boolean {
  const battle = state.battle!;
  const area = battle.areas.find((a) => a.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return false;
  if (wealdMechanicsActive(state) && area.zeroCapacity === true) return false;
  return area.capacity! >= 1;
}

function entityWidth(entity: BattleEntity): number {
  return entity.side === "hero" ? 1 : entity.stanceSlots!;
}

function areaOccupancy(battle: BattleState, areaId: string, excludeId?: string): number {
  return livingEntities(battle)
    .filter((e) => e.areaId === areaId && e.id !== excludeId)
    .reduce((sum, e) => sum + entityWidth(e), 0);
}

function areaHasSpace(
  state: GameState,
  battle: BattleState,
  areaId: string,
  width: number,
  excludeId?: string,
): boolean {
  if (!areaLegalForSummonEnd(state, areaId)) return false;
  const area = battle.areas.find((a) => a.id === areaId)!;
  return areaOccupancy(battle, areaId, excludeId) + width <= area.capacity!;
}

/** R-034 / rulings「召唤怪物的棋子放在哪里」：姿态对应区域挤占，与 Collector 规则对齐。 */
export function resolveWealdSummonAreaPlacement(
  state: GameState,
  preferredAreaId: string,
  summonWidth: 1 | 2,
  optionId?: string,
):
  | { readonly battle: BattleState; readonly areaId: string }
  | {
      readonly status: "choice";
      readonly options: readonly { readonly id: string; readonly label: string }[];
    }
  | { readonly status: "refused"; readonly message: string } {
  const battle = state.battle!;
  const preferred = battle.areas.find((a) => a.id === preferredAreaId);
  if (!preferred || !areaLegalForSummonEnd(state, preferredAreaId))
    return {
      status: "refused",
      message: "Weald 召唤：姿态对应区域未核实或为零容量禁居格（R-048、W-03）",
    };
  if (areaHasSpace(state, battle, preferredAreaId, summonWidth))
    return optionId === undefined
      ? { battle, areaId: preferredAreaId }
      : { status: "refused", message: "Weald 召唤：挤占选择已过期" };

  const occupants = livingEntities(battle).filter((e) => e.areaId === preferredAreaId);
  const monsters = occupants.filter((e) => e.side === "monster");
  const monstersFull = monsters.reduce((n, e) => n + e.stanceSlots!, 0) >= preferred.capacity!;
  const movers = monstersFull ? monsters : occupants.filter((e) => e.side === "hero");
  const options = movers
    .flatMap((entity) => {
      const width = entityWidth(entity);
      const available = battle.areas
        .filter(
          (a) => a.id !== preferredAreaId && areaHasSpace(state, battle, a.id, width, entity.id),
        )
        .map((a) => ({ areaId: a.id, steps: distance(battle.areas, preferredAreaId, a.id) }))
        .filter((a) => a.steps !== null);
      if (!available.length) return [];
      const nearest = Math.min(...available.map((a) => a.steps!));
      return available
        .filter((a) => a.steps === nearest)
        .map((a) => ({
          id: JSON.stringify([entity.id, a.areaId]),
          label: `${entity.id} → ${a.areaId}`,
          entityId: entity.id,
          areaId: a.areaId,
        }));
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!options.length)
    return { status: "refused", message: "Weald 召唤：挤占没有最近可用区域（R-034）" };
  if (optionId !== undefined && !options.some((o) => o.id === optionId))
    return { status: "refused", message: "Weald 召唤：挤占选择已过期" };
  if (optionId === undefined && (monstersFull || options.length > 1))
    return { status: "choice", options: options.map(({ id, label }) => ({ id, label })) };
  const chosen = options.find((o) => o.id === optionId) ?? options[0]!;
  return {
    battle: {
      ...battle,
      entities: battle.entities.map((e) =>
        e.id === chosen.entityId ? { ...e, areaId: chosen.areaId } : e,
      ),
    },
    areaId: preferredAreaId,
  };
}

function stanceAreaId(battle: BattleState, stance: (typeof STANCES)[number]): string | null {
  const areaId = battle.monsterStanceAreas?.[stance];
  if (!areaId) return null;
  return areaId;
}

/** 技能结算后接 R-230 召唤：首空姿态位 + 姿态对应区域（R-034、R31）。 */
export function continueWealdMonsterSummon(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
  casualtyIds: readonly string[],
  displacement?: string,
): ApplyResult | null {
  const { wealdSummon: summon, ...continued } = resolved;
  if (!summon) return null;
  const state = result.state;
  if (!wealdPackSelected(state.dungeon?.contentPacks))
    return rejectBattleCommand(state, "Weald 召唤仅在启用 weald 内容包时生效（R-048）");
  const battle = state.battle!;
  const actor = battle.entities.find((e) => e.id === resolved.actorId);
  if (actor?.dead) return recordMonsterSkill(result, continued, casualtyIds);

  const card = readMonsterCard(state, battle, summon.cardId);
  const dodge = card ? readMonsterDodge(card as MonsterCardView & { dodge?: number }) : undefined;
  if (
    !card ||
    card.verification.unverified ||
    !Number.isSafeInteger(card.life) ||
    card.life < 1 ||
    dodge === undefined
  )
    return rejectBattleCommand(
      state,
      `Weald 召唤缺少已核准目录卡 ${summon.cardId}（R-230、R-232）`,
    );

  const width = stanceSlotsFor(card);
  const occupied = occupiedMonsterStanceIndexes(battle);
  const stance = pickOpenMonsterStance(occupied, width);
  if (!stance) {
    return recordMonsterSkill(
      {
        ...result,
        events: [
          ...result.events,
          { type: "dungeonUpdated", message: "Weald 召唤：姿态轨已满，召唤无效（R31）" },
        ],
      },
      continued,
      casualtyIds,
    );
  }
  const preferredAreaId = stanceAreaId(battle, stance);
  if (!preferredAreaId)
    return rejectBattleCommand(state, "Weald 召唤缺少已核实 monsterStanceAreas（R-048）");

  const placement = resolveWealdSummonAreaPlacement(state, preferredAreaId, width, displacement);
  if ("status" in placement) {
    if (placement.status === "refused") return rejectBattleCommand(state, placement.message);
    const choice = {
      id: `weald-summon:${battle.choiceCursor}`,
      prompt: "召唤区域已满：选择角色与最近可用区域（R-034）",
      options: placement.options,
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "wealdSummon", choice, resolved, casualtyIds },
        },
      },
      events: result.events,
      pendingChoice: choice,
    };
  }

  const areaId = placement.areaId;
  const entities = placement.battle.entities;
  const summonEntity: BattleEntity = {
    id: `weald-summon:${summon.cardId}:${battle.choiceCursor}`,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId,
    stance,
    stanceSlots: width,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    statusStacks: [],
  };
  const withEntity: BattleState = {
    ...placement.battle,
    pending: null,
    entities: [...entities, summonEntity],
    monsters: battle.monsters?.some((c) => c.id === card.id)
      ? battle.monsters
      : [...(battle.monsters ?? []), card],
    choiceCursor: battle.choiceCursor + 1,
  };
  const afterInitiative = insertMonsterInitiative({ ...state, battle: withEntity });
  return recordMonsterSkill(
    {
      state: afterInitiative,
      events: [
        ...result.events,
        {
          type: "dungeonUpdated",
          message: `Weald 召唤：${card.id} → ${stance} / ${areaId}，先攻洗入当前牌堆（R31、R-034）`,
        },
      ],
    },
    continued,
    casualtyIds,
  );
}

export function chooseWealdMonsterSummon(state: GameState, optionId: string): ApplyResult {
  const pending = state.battle?.pending;
  if (pending?.type !== "wealdSummon") return rejectBattleCommand(state, "没有 Weald 召唤待选");
  return continueWealdMonsterSummon(
    { state, events: [] },
    pending.resolved,
    pending.casualtyIds,
    optionId,
  )!;
}

/** 测试夹具：合并核准 Weald 战斗目录到 battle.monsters。 */
export function mergeWealdBattleMonsters(
  state: GameState,
  medium: unknown,
  large: unknown,
): GameState {
  if (!state.battle) return state;
  const catalog = buildWealdMonsterCatalog(medium, large);
  const existing = state.battle.monsters ?? [];
  const ids = new Set(existing.map((c) => c.id));
  return {
    ...state,
    battle: {
      ...state.battle,
      monsters: [...existing, ...catalog.filter((c) => !ids.has(c.id))],
    },
  };
}
