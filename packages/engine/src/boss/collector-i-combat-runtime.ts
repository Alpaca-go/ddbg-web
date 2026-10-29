import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  COLLECTOR_I_COLLECT_ALL_PART_ORDER,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  collectorCollectedCardIds,
  collectorCollectedPartCardId,
  collectorCollectedPartStance,
} from "./collector-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk, CollectorCollectedPart } from "./types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

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

/** Collector I · Collect All：回合开始无 Collected 时召唤三卡并结束本怪物回合（先攻洗入 hold）。 */
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
    const areaId = stanceAreaId(nextBattle, stance);
    if (!areaId || !areaHasSpaceForCollected(nextBattle, areaId, 1)) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Collect All：${stance} 对应区域无容量（R-048；最近区域 hold）`,
          },
        ],
      };
    }
    const entity = buildCollectedEntity(part, card, areaId, stance);
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

  return finishTurn(
    {
      ...state,
      battle: { ...nextBattle, monsterAction: null },
    },
    actorId,
    [
      {
        type: "dungeonUpdated",
        message: `Collector I · Collect All：写入 ${added.join("、")}（${script.displayName}；先攻洗入 hold）`,
      },
    ],
  );
}

export function isCollectorCollectedMonsterCardId(cardId: string): boolean {
  return collectorCollectedCardIds().includes(cardId);
}
