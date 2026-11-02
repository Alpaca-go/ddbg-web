import type { BattleEntity, BattleState, OneBodyLifePool } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  FLESH_I_COMBAT_MONSTER_CARD_ID,
  FLESH_I_HEAD_MONSTER_CARD_ID,
  FLESH_I_ONE_BODY_POOL_ID,
  FLESH_I_ONE_BODY_PART_ORDER,
  FLESH_I_SCRIPT_ID,
  fleshOneBodyPartCardId,
  fleshOneBodyPartStance,
} from "./flesh-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk, FleshOneBodyPart } from "./types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

export function readFleshIOneBodyPartBattleStartPlan(
  script: BossScriptDefinition,
  part: FleshOneBodyPart,
): BossSummonOk["value"] | null {
  if (script.id !== FLESH_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "battleStartOneBodyPart",
    oneBodyPart: part,
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function readFleshIOneBodyMorphEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== FLESH_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "oneBodyMorph", {
    scriptId: script.id,
    round: 2,
  });
  return result.status === "ok" && result.effect === "randomPartCardPerStanceEachRoundStart";
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function fleshPartCardIds(): readonly string[] {
  return FLESH_I_ONE_BODY_PART_ORDER.map((part) => fleshOneBodyPartCardId(part));
}

function readPartCard(battle: BattleState, cardId: string): MonsterCardView | null {
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

function fleshEntities(battle: BattleState): readonly BattleEntity[] {
  const ids = new Set(fleshPartCardIds());
  return livingMonsters(battle).filter(
    (entity) => entity.monsterCardId && ids.has(entity.monsterCardId),
  );
}

function poolFromEntities(
  entities: readonly BattleEntity[],
  pools: BattleState["oneBodyPools"],
): OneBodyLifePool | null {
  const member = entities.find((entity) => entity.oneBodyPoolId === FLESH_I_ONE_BODY_POOL_ID);
  if (!member) return null;
  const stored = pools?.[FLESH_I_ONE_BODY_POOL_ID];
  if (stored) return stored;
  if (member.life === undefined) return null;
  return { life: member.life, wounds: member.wounds };
}

/** 生命效果结算后同步 One Body 共享 Life / wounds。 */
export function reconcileFleshOneBodyPools(
  battle: BattleState,
  entities: readonly BattleEntity[],
): readonly BattleEntity[] {
  const flesh = entities.filter(
    (entity) =>
      entity.side === "monster" &&
      entity.oneBodyPoolId === FLESH_I_ONE_BODY_POOL_ID &&
      !entity.dead,
  );
  if (flesh.length === 0) return entities;
  const maxWounds = Math.max(...flesh.map((entity) => entity.wounds));
  const stored = battle.oneBodyPools?.[FLESH_I_ONE_BODY_POOL_ID];
  const life = stored?.life ?? flesh.find((entity) => entity.life !== undefined)?.life ?? null;
  if (life === null) return entities;
  const pool = { life, wounds: maxWounds };
  const dead = pool.wounds >= pool.life;
  return entities.map((entity) => {
    if (entity.oneBodyPoolId !== FLESH_I_ONE_BODY_POOL_ID) return entity;
    return {
      ...entity,
      life: pool.life,
      wounds: pool.wounds,
      dead: dead || entity.dead,
    };
  });
}

export function withFleshOneBodyPoolState(
  battle: BattleState,
  entities: readonly BattleEntity[],
): BattleState {
  const synced = reconcileFleshOneBodyPools(battle, entities);
  const flesh = synced.filter(
    (entity) => entity.oneBodyPoolId === FLESH_I_ONE_BODY_POOL_ID && !entity.dead,
  );
  if (flesh.length === 0) return { ...battle, entities: synced };
  const pool = poolFromEntities(flesh, battle.oneBodyPools);
  if (!pool) return { ...battle, entities: synced };
  return {
    ...battle,
    entities: synced,
    oneBodyPools: { ...battle.oneBodyPools, [FLESH_I_ONE_BODY_POOL_ID]: pool },
  };
}

/** The Flesh I · One Body：Boss 战 `startBattle` 写入四部位 + 共享 Life 池。 */
export function applyFleshIOneBodyBattleStart(state: GameState): ApplyResult {
  const battle = state.battle;
  const d = state.dungeon;
  if (!battle || !d) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== FLESH_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script) return { state, events: [] };

  const existing = fleshEntities(battle);
  if (existing.length >= 4) {
    const synced = withFleshOneBodyPoolState(battle, battle.entities);
    if (synced === battle) return { state, events: [] };
    return {
      state: { ...state, battle: synced },
      events: [
        {
          type: "dungeonUpdated",
          message: "The Flesh I · One Body：四部位已在场，已同步共享 Life",
        },
      ],
    };
  }

  if (existing.length === 0) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "The Flesh I · One Body：缺少已核实 Head 实体，不能猜开战布置（R-048）",
        },
      ],
    };
  }

  const headCard = readPartCard(battle, FLESH_I_HEAD_MONSTER_CARD_ID);
  if (!headCard) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "The Flesh I · One Body：缺少已核实部位卡，不能猜开战布置（R-048）",
        },
      ],
    };
  }

  let nextBattle = battle;
  const added: string[] = [];
  const poolLife = headCard.life;
  const poolWounds = Math.max(...existing.map((entity) => entity.wounds));

  for (const part of FLESH_I_ONE_BODY_PART_ORDER) {
    const cardId = fleshOneBodyPartCardId(part);
    if (nextBattle.entities.some((entity) => entity.monsterCardId === cardId && !entity.dead)) {
      continue;
    }
    const plan = readFleshIOneBodyPartBattleStartPlan(script, part);
    if (!plan || plan.summonMonsterCardId !== cardId) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `The Flesh I · One Body：部位 ${part} 召唤计划未核实（R-048）`,
          },
        ],
      };
    }
    const card = readPartCard(nextBattle, cardId);
    if (!card) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `The Flesh I · One Body：缺少已核实 ${part} 卡（R-048）`,
          },
        ],
      };
    }
    const stance = plan.fixedStance ?? fleshOneBodyPartStance(part);
    const position = STANCES.indexOf(stance);
    if (position < 0 || !stanceTrackFree(nextBattle, position, 1)) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `The Flesh I · One Body：姿态轨 ${stance} 无空间（R-048）`,
          },
        ],
      };
    }
    const areaId = stanceAreaId(nextBattle, stance);
    if (!areaId) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `The Flesh I · One Body：缺 ${stance} 对应区域（R-048）`,
          },
        ],
      };
    }
    const id = `flesh:${part}`;
    const entity: BattleEntity = {
      id,
      side: "monster",
      hero: null,
      monsterCardId: cardId,
      life: poolLife,
      wounds: poolWounds,
      dodge: 0,
      areaId,
      stance,
      stanceSlots: 1,
      shuffleResist: false,
      skillIds: [],
      guard: false,
      dead: poolWounds >= poolLife,
      bleed: [],
      blight: [],
      oneBodyPoolId: FLESH_I_ONE_BODY_POOL_ID,
    };
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

  const withPool = withFleshOneBodyPoolState(
    nextBattle,
    nextBattle.entities.map((entity) =>
      entity.monsterCardId && fleshPartCardIds().includes(entity.monsterCardId)
        ? {
            ...entity,
            oneBodyPoolId: FLESH_I_ONE_BODY_POOL_ID,
            life: poolLife,
            wounds: poolWounds,
            dead: poolWounds >= poolLife,
          }
        : entity,
    ),
  );

  if (added.length === 0) return { state, events: [] };

  return {
    state: { ...state, battle: withPool },
    events: [
      {
        type: "dungeonUpdated",
        message: `The Flesh I · One Body：写入 ${added.join("、")}（共享 Life ${poolLife}；${script.displayName}）`,
      },
    ],
  };
}

/** 每轮开始 morph：随机部位表未核实，拒绝且不消耗 RNG。 */
export function applyFleshOneBodyMorphAtRoundStart(state: GameState, round: number): ApplyResult {
  if (round <= 1) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== FLESH_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script || !readFleshIOneBodyMorphEnabled(script)) return { state, events: [] };
  return {
    state,
    events: [
      {
        type: "commandRefused",
        message:
          "The Flesh I · One Body morph：随机部位表 / 位移未核实，不能猜 morph（R-048；hold）",
      },
    ],
  };
}

export function isFleshOneBodyCombatMonsterCardId(cardId: string): boolean {
  return fleshPartCardIds().includes(cardId) || cardId === FLESH_I_COMBAT_MONSTER_CARD_ID;
}
