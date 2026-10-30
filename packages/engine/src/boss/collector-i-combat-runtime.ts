import {
  RUINS_COMBAT_LEVELS,
  ruinsCombatForScript,
  isRuinsCombatCard,
} from "./ruins-combat-levels";
import type { BattleEntity, BattleState } from "../battle";
import { distance, rejectBattleCommand } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillTargetSide } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { createRng } from "../rng";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT,
  COLLECTOR_I_COLLECT_ALL_PART_ORDER,
  collectorCollectedCardIds,
  collectorCollectedPartStance,
} from "./collector-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk, CollectorCollectedPart } from "./types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

type InitiativeSide = SkillTargetSide;

export function readCollectorICollectAllPartPlan(
  script: BossScriptDefinition,
  part: CollectorCollectedPart,
): BossSummonOk["value"] | null {
  if (!ruinsCombatForScript("collector", script.id)) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "collectAllPart",
    collectedPart: part,
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function readCollectorICollectAllEnabled(script: BossScriptDefinition): boolean {
  if (!ruinsCombatForScript("collector", script.id)) return false;
  const result = runBossHook(script, "collectAll", {
    scriptId: script.id,
    monsterEntityId: "collector",
    round: 1,
  });
  return result.status === "ok" && result.effect === "summonThreeCollectedIfNoneInPlayAtTurnStart";
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function collectedEntities(battle: BattleState): readonly BattleEntity[] {
  const ids = new Set<string>(
    RUINS_COMBAT_LEVELS.collector.flatMap((e) => Object.values(e.collected)),
  );
  return livingMonsters(battle).filter(
    (entity) => entity.monsterCardId && ids.has(entity.monsterCardId),
  );
}

function collectorEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find((entity) =>
    isRuinsCombatCard("collector", entity.monsterCardId),
  );
}

function readCollectedCard(battle: BattleState, cardId: string): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === cardId);
  if (!card || card.verification.unverified) return null;
  if (!Number.isInteger(card.life) || card.life < 1) return null;
  return card;
}

function stanceTrackFree(battle: BattleState, position: number, width: 1 | 2): boolean {
  const occupied = new Set<number>();
  for (const entity of livingMonsters(battle)) {
    const index = STANCES.indexOf(entity.stance as (typeof STANCES)[number]);
    if (index < 0) return false;
    for (let slot = index; slot < index + entity.stanceSlots!; slot += 1) occupied.add(slot);
  }
  for (let slot = position; slot < position + width; slot += 1) {
    if (occupied.has(slot)) return false;
  }
  return position >= 0 && position + width <= 4;
}

function stanceAreaId(battle: BattleState, stance: (typeof STANCES)[number]): string | null {
  return stance === "aggressive" ? null : (battle.collectorCollectedStanceAreas?.[stance] ?? null);
}

function areaOccupancy(battle: BattleState, areaId: string): number {
  return battle.entities
    .filter((entity) => !entity.dead && entity.areaId === areaId)
    .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0);
}

function areaHasSpaceForCollected(battle: BattleState, areaId: string, width: 1 | 2): boolean {
  const area = battle.areas.find((entry) => entry.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return false;
  return areaOccupancy(battle, areaId) + width <= area.capacity!;
}

function occupancyExcluding(battle: BattleState, areaId: string, excludeEntityId?: string): number {
  return battle.entities
    .filter((entity) => !entity.dead && entity.areaId === areaId && entity.id !== excludeEntityId)
    .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0);
}

function areaHasSpaceExcluding(
  battle: BattleState,
  areaId: string,
  width: 1 | 2,
  excludeEntityId?: string,
): boolean {
  const area = battle.areas.find((entry) => entry.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return false;
  return occupancyExcluding(battle, areaId, excludeEntityId) + width <= area.capacity!;
}

/** R31、R-034：优先挤占英雄；区域被怪物占满时由玩家选怪物和最近可用区域。 */
export function resolveCollectorCollectedAreaPlacement(
  battle: BattleState,
  preferredAreaId: string,
  optionId?: string,
):
  | { readonly battle: BattleState; readonly areaId: string }
  | {
      readonly status: "choice";
      readonly options: readonly { readonly id: string; readonly label: string }[];
    }
  | { readonly status: "refused"; readonly message: string } {
  const preferred = battle.areas.find((area) => area.id === preferredAreaId);
  if (
    !preferred ||
    !Number.isSafeInteger(preferred.capacity) ||
    preferred.capacity! < 1 ||
    battle.areas.some(
      (a) =>
        !Number.isSafeInteger(a.capacity) ||
        a.capacity! < 0 ||
        a.adjacent.some((id) => !battle.areas.some((other) => other.id === id)),
    ) ||
    battle.entities.some((e) => !e.dead && e.side === "monster" && ![1, 2].includes(e.stanceSlots!))
  ) {
    return { status: "refused", message: "Collect All：姿态对应区域未核实（R-048）" };
  }
  if (areaHasSpaceForCollected(battle, preferredAreaId, 1)) {
    return optionId === undefined
      ? { battle, areaId: preferredAreaId }
      : { status: "refused", message: "Collect All：挤占选择已过期" };
  }
  const occupants = battle.entities.filter((e) => !e.dead && e.areaId === preferredAreaId);
  const monsters = occupants.filter((e) => e.side === "monster");
  const monstersFull = monsters.reduce((n, e) => n + e.stanceSlots!, 0) >= preferred.capacity!;
  const movers = monstersFull ? monsters : occupants.filter((e) => e.side === "hero");
  const options = movers
    .flatMap((entity) => {
      const width = entity.side === "hero" ? 1 : entity.stanceSlots!;
      if (occupancyExcluding(battle, preferredAreaId, entity.id) + 1 > preferred.capacity!)
        return [];
      const available = battle.areas
        .filter(
          (a) => a.id !== preferredAreaId && areaHasSpaceExcluding(battle, a.id, width, entity.id),
        )
        .map((a) => ({ areaId: a.id, steps: distance(battle.areas, preferredAreaId, a.id) }))
        .filter((a) => a.steps !== null);
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
    return {
      status: "refused",
      message: "Collect All：挤占没有最近可用区域（R-034）；不能改放召唤物",
    };
  if (optionId !== undefined && !options.some((o) => o.id === optionId))
    return { status: "refused", message: "Collect All：挤占选择已过期" };
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

function shuffleMonsterInitiativeIntoDeck(
  seed: number,
  cursor: number,
  deck: readonly InitiativeSide[],
  count: number,
): { readonly deck: InitiativeSide[]; readonly cursor: number } {
  const nextDeck = [...deck];
  let nextCursor = cursor;
  for (let added = 0; added < count; added += 1) {
    const rng = createRng(seed);
    for (let index = 0; index < nextCursor; index += 1) rng.next();
    const insertAt = Math.floor(rng.next() * (nextDeck.length + 1));
    nextCursor += 1;
    nextDeck.splice(insertAt, 0, "monster");
  }
  return { deck: nextDeck, cursor: nextCursor };
}

export function shuffleCollectorCollectAllInitiativeIntoDeck(
  state: GameState,
  count: number = COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT,
): GameState {
  const battle = state.battle;
  if (!battle?.encounter || count <= 0) return state;
  if (!ruinsCombatForScript("collector", resolveEncounterBossScriptId(state))) return state;
  const shuffled = shuffleMonsterInitiativeIntoDeck(
    state.seed,
    battle.rngCursor,
    battle.encounter.deck,
    count,
  );
  return {
    ...state,
    battle: {
      ...battle,
      rngCursor: shuffled.cursor,
      encounter: { ...battle.encounter, deck: shuffled.deck },
    },
  };
}

export function collectorCollectAllShouldReplaceSkill(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readCollectorICollectAllEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || !isRuinsCombatCard("collector", actor.monsterCardId) || actor.dead) {
    return false;
  }

  return collectedEntities(battle).length === 0;
}

function buildCollectedEntity(
  part: CollectorCollectedPart,
  card: MonsterCardView,
  areaId: string,
  stance: (typeof STANCES)[number],
): BattleEntity {
  const dodge =
    (card as MonsterCardView & { readonly dodge?: number }).dodge ??
    (card as { readonly dodge?: number }).dodge ??
    card.header_unlabeled_numbers?.find(
      (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
    )?.numeric ??
    0;
  return {
    id: `collected:${part}`,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId,
    stance,
    stanceSlots: 1,
    shuffleResist: (card.resistances ?? []).some((icon) => icon.key === "shuffle_resist"),
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
}

/** Collector I · Collect All：回合开始无 Collected 时召唤三卡、洗入先攻并结束本怪物回合。 */
export function applyCollectorCollectAll(
  state: GameState,
  actorId: string,
  displacements: Readonly<Partial<Record<CollectorCollectedPart, string>>> = {},
): ApplyResult {
  const battle = state.battle!;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !ruinsCombatForScript("collector", script.id)) {
    return { state, events: [] };
  }
  if (
    collectorEntity(battle)?.id !== actorId ||
    battle.encounter?.turn.type !== "monster" ||
    battle.encounter.turn.actorId !== actorId
  )
    return rejectBattleCommand(state, "Collect All：当前不是存活收藏家的回合");
  if (collectedEntities(battle).length > 0) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Collect All：场上已有 Collected（R-048）" }],
    };
  }

  for (const part of COLLECTOR_I_COLLECT_ALL_PART_ORDER) {
    const areaId = stanceAreaId(battle, collectorCollectedPartStance(part));
    if (!areaId || !battle.areas.some((a) => a.id === areaId))
      return rejectBattleCommand(
        state,
        `Collect All：${part} 缺少有效显式姿态区域绑定（R-048；生产几何仍 hold）`,
      );
    if (!readCollectedCard(battle, ruinsCombatForScript("collector", script.id)!.collected[part]))
      return rejectBattleCommand(
        state,
        `Collect All：缺少已核实 ${ruinsCombatForScript("collector", script.id)!.collected[part]}（R-048）`,
      );
  }
  let nextBattle: BattleState = { ...battle, pending: null };
  const added: string[] = [];

  for (const part of COLLECTOR_I_COLLECT_ALL_PART_ORDER) {
    const cardId = ruinsCombatForScript("collector", script.id)!.collected[part];
    const plan = readCollectorICollectAllPartPlan(script, part);
    if (!plan || plan.summonMonsterCardId !== cardId) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Collect All：${part} 召唤计划未核实（R-048）`,
          },
        ],
      };
    }
    const card = readCollectedCard(nextBattle, cardId);
    if (!card) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Collect All：缺少已核实 ${cardId}（R-048）`,
          },
        ],
      };
    }
    const stance = plan.fixedStance ?? collectorCollectedPartStance(part);
    const position = STANCES.indexOf(stance);
    if (position < 0 || !stanceTrackFree(nextBattle, position, 1)) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Collect All：姿态轨 ${stance} 无空间（R-048；最近区域挤占 hold）`,
          },
        ],
      };
    }
    const preferredAreaId = stanceAreaId(nextBattle, stance);
    if (!preferredAreaId) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Collect All：${stance} 缺少显式姿态区域绑定（R-048；生产几何仍 hold）`,
          },
        ],
      };
    }
    const placement = resolveCollectorCollectedAreaPlacement(
      nextBattle,
      preferredAreaId,
      displacements[part],
    );
    if ("status" in placement) {
      if (placement.status === "choice") {
        const choice = {
          id: `collector-summon:${battle.choiceCursor}:${part}`,
          actorId,
          prompt: `Collect All · ${part}：选择挤占角色与最近可用区域（R-034）`,
          options: placement.options,
        };
        return {
          state: {
            ...state,
            battle: {
              ...battle,
              choiceCursor: battle.choiceCursor + 1,
              pending: { type: "collectorSummon", actorId, part, displacements, choice },
            },
          },
          events: [],
          pendingChoice: choice,
        };
      }
      return { state, events: [{ type: "commandRefused", message: placement.message }] };
    }
    nextBattle = placement.battle;
    const rawEntity = buildCollectedEntity(part, card, placement.areaId, stance);
    const entity = nextBattle.entities.some((e) => e.id === rawEntity.id)
      ? { ...rawEntity, id: `${rawEntity.id}:${nextBattle.entities.length}` }
      : rawEntity;
    const monsters = nextBattle.monsters?.some((entry) => entry.id === cardId)
      ? nextBattle.monsters
      : [...(nextBattle.monsters ?? []), card];
    nextBattle = {
      ...nextBattle,
      monsters,
      entities: [...nextBattle.entities, entity],
    };
    added.push(part);
  }

  if (added.length !== COLLECTOR_I_COLLECT_ALL_PART_ORDER.length) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Collect All：召唤未完成（R-048）" }],
    };
  }

  let nextState: GameState = {
    ...state,
    battle: { ...nextBattle, monsterAction: null },
  };
  const initiativeShuffle = COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT;
  nextState = shuffleCollectorCollectAllInitiativeIntoDeck(nextState, initiativeShuffle);

  return finishTurn(nextState, actorId, [
    {
      type: "dungeonUpdated",
      message: `Collector I · Collect All：写入 ${added.join("、")}（${script.displayName}；洗入 ${initiativeShuffle} 张怪物先攻，spec §14.5 R39）`,
    },
  ]);
}

/** 待选期间保留原战斗，只暂存选择；完整规划成功后才写入三次召唤、位移和先攻。 */
export function chooseCollectorISummon(state: GameState, optionId: string): ApplyResult {
  const pending = state.battle?.pending;
  if (pending?.type !== "collectorSummon")
    return rejectBattleCommand(state, "没有 Collect All 挤占待选");
  return applyCollectorCollectAll(state, pending.actorId, {
    ...pending.displacements,
    [pending.part]: optionId,
  });
}

export function isCollectorCollectedMonsterCardId(cardId: string): boolean {
  return collectorCollectedCardIds().includes(cardId);
}
