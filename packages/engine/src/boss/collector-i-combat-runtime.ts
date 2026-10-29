import type { BattleArea, BattleEntity, BattleState } from "../battle";
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
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES,
  COLLECTOR_I_SCRIPT_ID,
  collectorCollectedCardIds,
  collectorCollectedPartCardId,
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
  if (script.id !== COLLECTOR_I_SCRIPT_ID) return null;
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
  if (script.id !== COLLECTOR_I_SCRIPT_ID) return false;
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
  const ids = new Set(collectorCollectedCardIds());
  return livingMonsters(battle).filter(
    (entity) => entity.monsterCardId && ids.has(entity.monsterCardId),
  );
}

function collectorEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
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
  const hero = battle.entities.find(
    (entity) => entity.side === "hero" && !entity.dead && entity.stance === stance,
  );
  return hero?.areaId ?? null;
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

function areasByIncreasingDistance(
  areas: readonly BattleArea[],
  fromAreaId: string,
): readonly string[] {
  const layers: string[][] = [];
  const seen = new Set<string>([fromAreaId]);
  let frontier = [fromAreaId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const adjacent of areas.find((area) => area.id === id)?.adjacent ?? []) {
        if (seen.has(adjacent)) continue;
        seen.add(adjacent);
        next.push(adjacent);
      }
    }
    if (next.length > 0) {
      layers.push([...next].sort((left, right) => left.localeCompare(right)));
    }
    frontier = next;
  }
  return layers.flat();
}

/** R38–R39：仅 Collector I 在场（无 Collected 实体）时先攻堆补足至 4 张 monster 侧（1 印刷 + 3 Collect All 语义）。 */
export function expandCollectorIInitiativeDeckSides(
  deck: readonly InitiativeSide[],
  battle: BattleState,
  state: GameState,
): InitiativeSide[] {
  if (resolveEncounterBossScriptId(state) !== COLLECTOR_I_SCRIPT_ID) return [...deck];
  const livingMonsters = battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
  if (
    livingMonsters.length !== 1 ||
    livingMonsters[0]!.monsterCardId !== COLLECTOR_I_COMBAT_MONSTER_CARD_ID
  ) {
    return [...deck];
  }
  const monsterSides = deck.filter((side) => side === "monster").length;
  const extra = COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES - monsterSides;
  if (extra <= 0) return [...deck];
  return [...deck, ...Array.from({ length: extra }, (): InitiativeSide => "monster")];
}

function occupancyExcluding(
  battle: BattleState,
  areaId: string,
  excludeEntityId?: string,
): number {
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

/** R-034 + boss_ability:p016「closest Area with enough space」：姿态对应区域满员时挤占英雄。 */
export function resolveCollectorCollectedAreaPlacement(
  battle: BattleState,
  preferredAreaId: string,
): { readonly battle: BattleState; readonly areaId: string } | { readonly status: "refused"; readonly message: string } {
  const preferred = battle.areas.find((area) => area.id === preferredAreaId);
  if (!preferred || !Number.isSafeInteger(preferred.capacity)) {
    return { status: "refused", message: "Collect All：姿态对应区域未核实（R-048）" };
  }
  if (areaHasSpaceForCollected(battle, preferredAreaId, 1)) {
    return { battle, areaId: preferredAreaId };
  }

  const heroesInPreferred = battle.entities
    .filter((entity) => !entity.dead && entity.side === "hero" && entity.areaId === preferredAreaId)
    .sort((left, right) => left.id.localeCompare(right.id));

  for (const hero of heroesInPreferred) {
    for (const candidateId of areasByIncreasingDistance(battle.areas, preferredAreaId)) {
      if (!areaHasSpaceExcluding(battle, candidateId, 1, hero.id)) continue;
      const movedEntities = battle.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: candidateId } : entity,
      );
      const movedBattle = { ...battle, entities: movedEntities };
      if (areaHasSpaceForCollected(movedBattle, preferredAreaId, 1)) {
        return { battle: movedBattle, areaId: preferredAreaId };
      }
    }
  }

  for (const candidateId of areasByIncreasingDistance(battle.areas, preferredAreaId)) {
    if (areaHasSpaceForCollected(battle, candidateId, 1)) {
      return { battle, areaId: candidateId };
    }
  }

  return {
    status: "refused",
    message: "Collect All：无最近可用区域（R-048；怪物挤占选择仍 hold）",
  };
}

function shuffleMonsterInitiativeIntoDeck(
  seed: number,
  cursor: number,
  deck: readonly InitiativeSide[],
  count: number,
): { readonly deck: InitiativeSide[]; readonly cursor: number } {
  let nextDeck = [...deck];
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
  if (resolveEncounterBossScriptId(state) !== COLLECTOR_I_SCRIPT_ID) return state;
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

export function collectorCollectAllShouldReplaceSkill(
  state: GameState,
  actorId: string,
): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readCollectorICollectAllEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.monsterCardId !== COLLECTOR_I_COMBAT_MONSTER_CARD_ID || actor.dead) {
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
export function applyCollectorCollectAll(state: GameState, actorId: string): ApplyResult {
  const battle = state.battle!;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || script.id !== COLLECTOR_I_SCRIPT_ID) {
    return { state, events: [] };
  }
  if (!collectorEntity(battle)) {
    return { state, events: [] };
  }
  if (collectedEntities(battle).length > 0) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Collect All：场上已有 Collected（R-048）" }],
    };
  }

  let nextBattle = battle;
  const added: string[] = [];

  for (const part of COLLECTOR_I_COLLECT_ALL_PART_ORDER) {
    const cardId = collectorCollectedPartCardId(part);
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
            message: `Collect All：${stance} 无对应英雄区域（R-048）`,
          },
        ],
      };
    }
    const placement = resolveCollectorCollectedAreaPlacement(nextBattle, preferredAreaId);
    if ("status" in placement) {
      return { state, events: [{ type: "commandRefused", message: placement.message }] };
    }
    nextBattle = placement.battle;
    const entity = buildCollectedEntity(part, card, placement.areaId, stance);
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
  const monsterInDeck =
    nextState.battle!.encounter!.deck.filter((side) => side === "monster").length;
  const initiativeShuffle = Math.max(
    0,
    COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES - monsterInDeck,
  );
  if (initiativeShuffle > 0) {
    nextState = shuffleCollectorCollectAllInitiativeIntoDeck(
      nextState,
      initiativeShuffle,
    );
  }

  return finishTurn(nextState, actorId, [
    {
      type: "dungeonUpdated",
      message: `Collector I · Collect All：写入 ${added.join("、")}（${script.displayName}；洗入 ${initiativeShuffle} 张怪物先攻，spec §14.5 R39）`,
    },
  ]);
}

export function isCollectorCollectedMonsterCardId(cardId: string): boolean {
  return collectorCollectedCardIds().includes(cardId);
}
