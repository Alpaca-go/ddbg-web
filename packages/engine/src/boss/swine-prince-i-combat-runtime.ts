import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../command";
import { skillTargetView, writeResolution, distance } from "../battle";
import { applySkillHealth } from "../battle-health";
import { nextBattleRoll } from "../encounter";
import type { MonsterCardView } from "../monster-skill";
import { readMonsterAttackView, resolveMonsterSkill, resolveMonsterSkillEffects } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MARK_SKILL_SLOT,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  swinePrinceIWilburBattleStartStance,
} from "./swine-prince-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk } from "./types";
import { monsterCombatThreatDamageBonus } from "./threat-passive-runtime";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

export function readSwinePrinceIWilburBattleStartPlan(
  script: BossScriptDefinition,
): BossSummonOk["value"] | null {
  if (script.id !== SWINE_PRINCE_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "battleStartWilbur",
  });
  if (result.status !== "ok") return null;
  return result.value;
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function princeEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  );
}

function wilburEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  );
}

export function readSwinePrinceIWilburMarkEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== SWINE_PRINCE_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "wilburMark", { scriptId: script.id });
  return (
    result.status === "ok" &&
    result.effect === "forceMarkSkillWhilePrinceAlive" &&
    result.skillSlot === SWINE_PRINCE_I_WILBUR_MARK_SKILL_SLOT
  );
}

export function readSwinePrinceIWilburMarkSkillSlot(
  script: BossScriptDefinition,
): number | null {
  if (!readSwinePrinceIWilburMarkEnabled(script)) return null;
  const result = runBossHook(script, "wilburMark", { scriptId: script.id });
  if (result.status !== "ok") return null;
  return result.skillSlot;
}

/** Prince 仍在场且 Wilbur 轮到行动 → 强制 Mark 技能 slot，不走姿态骰表。 */
export function swinePrinceIWilburMarkShouldForceSkill(
  state: GameState,
  actorId: string,
): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readSwinePrinceIWilburMarkEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.dead || actor.monsterCardId !== SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID) {
    return false;
  }
  const prince = princeEntity(battle);
  return Boolean(prince);
}

function readWilburCard(battle: BattleState): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID);
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

/** Swine Prince I · Wilbur：Boss 战 `startBattle` 前写入 Wilbur 实体（支援姿态 + 对应区域）。 */
export function applySwinePrinceIWilburBattleStart(state: GameState): ApplyResult {
  const battle = state.battle;
  const d = state.dungeon;
  if (!battle || !d) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== SWINE_PRINCE_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script) return { state, events: [] };
  if (!princeEntity(battle)) return { state, events: [] };
  if (wilburEntity(battle)) return { state, events: [] };

  const plan = readSwinePrinceIWilburBattleStartPlan(script);
  if (!plan || plan.summonMonsterCardId !== SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID) {
    return { state, events: [] };
  }
  const fixedStance = plan.fixedStance ?? swinePrinceIWilburBattleStartStance();
  if (fixedStance !== swinePrinceIWilburBattleStartStance()) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Swine Prince Wilbur 开战姿态未核实（R-048）",
        },
      ],
    };
  }

  const card = readWilburCard(battle);
  if (!card) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: `Swine Prince Wilbur 缺少已核实 ${SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID}，不能猜开战布置（R-048）`,
        },
      ],
    };
  }

  const position = STANCES.indexOf(fixedStance);
  const width = 1 as const;
  if (!stanceTrackFree(battle, position, width)) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Swine Prince Wilbur 支援姿态轨无空间，不能猜开战布置（R-048）",
        },
      ],
    };
  }

  const areaId = stanceAreaId(battle, fixedStance);
  if (!areaId || !battle.areas.some((area) => area.id === areaId)) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Swine Prince Wilbur 缺支援姿态对应区域，不能猜落点（R-048）",
        },
      ],
    };
  }

  const wilburId = "boss:swine-prince:wilbur";
  const dodge =
    (card as MonsterCardView & { readonly dodge?: number }).dodge ??
    (card as { readonly dodge?: number }).dodge ??
    0;
  const entity: BattleEntity = {
    id: wilburId,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId,
    stance: fixedStance,
    stanceSlots: width,
    shuffleResist: (card.resistances ?? []).some((icon) => icon.key === "shuffle_resist"),
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    ...(card.innateProtection === undefined
      ? {}
      : { innateProtection: card.innateProtection, protection: card.innateProtection }),
    bleed: [],
    blight: [],
  };

  return {
    state: {
      ...state,
      battle: {
        ...battle,
        entities: [...battle.entities, entity],
        monsters: battle.monsters?.some((entry) => entry.id === card.id)
          ? battle.monsters
          : [...(battle.monsters ?? []), card],
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Swine Prince I · Wilbur：支援姿态开局写入 ${wilburId}（${areaId}；${script.displayName}）`,
      },
    ],
  };
}

export function readSwinePrinceIEnragedDestructionEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== SWINE_PRINCE_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "enragedDestruction", { scriptId: script.id });
  return (
    result.status === "ok" &&
    result.effect === "princeUsesSkillWhenWilburDamaged" &&
    result.targetPolicy === "offendingHero" &&
    result.skillSlot === SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT
  );
}

export function readSwinePrinceIEnragedDestructionSkillSlot(
  script: BossScriptDefinition,
): number | null {
  if (!readSwinePrinceIEnragedDestructionEnabled(script)) return null;
  const result = runBossHook(script, "enragedDestruction", { scriptId: script.id });
  if (result.status !== "ok") return null;
  return result.skillSlot;
}

function wilburWoundsIncreased(
  before: readonly BattleEntity[],
  after: readonly BattleEntity[],
): boolean {
  const prior = before.find(
    (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID && !entity.dead,
  );
  const next = after.find(
    (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID && !entity.dead,
  );
  if (!prior || !next) return false;
  return next.wounds > prior.wounds;
}

/** Wilbur 本技能结算后伤口增加 → Prince 对施法英雄立即 Enraged Destruction（不占用怪物回合）。 */
export function applySwinePrinceIEnragedDestruction(
  state: GameState,
  offendingHeroId: string,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== SWINE_PRINCE_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script || !readSwinePrinceIEnragedDestructionEnabled(script)) return { state, events: [] };

  const prince = princeEntity(battle);
  if (!prince) return { state, events: [] };
  const offender = battle.entities.find(
    (entity) => entity.id === offendingHeroId && entity.side === "hero" && !entity.dead,
  );
  if (!offender) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Enraged Destruction：缺有效施法英雄（R-048）" }],
    };
  }

  const card = battle.monsters?.find((entry) => entry.id === prince.monsterCardId);
  if (!card || card.verification.unverified) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Enraged Destruction：Swine Prince 卡未核实（R-048）",
        },
      ],
    };
  }
  if (prince.life !== card.life) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Enraged Destruction：Prince Life 不一致（R-048）" }],
    };
  }

  const skillSlot = readSwinePrinceIEnragedDestructionSkillSlot(script);
  if (skillSlot === null) return { state, events: [] };
  const attack = readMonsterAttackView(card, skillSlot);
  if (attack.status === "refused") {
    return {
      state,
      events: [{ type: "commandRefused", message: attack.reason }],
    };
  }

  const actorArea = battle.areas.find((entry) => entry.id === prince.areaId);
  const targetArea = battle.areas.find((entry) => entry.id === offender.areaId);
  if (!actorArea || !targetArea) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Enraged Destruction：区域几何未核实（R-048）" }],
    };
  }
  const areaDistance =
    prince.areaId === offender.areaId
      ? 0
      : distance(battle.areas, prince.areaId, offender.areaId);
  if (areaDistance === null) {
    return {
      state,
      events: [
        { type: "commandRefused", message: "Enraged Destruction：Prince 与目标不可达（R-048）" },
      ],
    };
  }

  const heights = { low: 0, normal: 1, high: 2 };
  let cursor = battle.rngCursor;
  const roll = nextBattleRoll(state.seed, cursor);
  cursor += 1;
  const combat = {
    actor: {
      id: prince.id,
      wounds: prince.wounds,
      ...(prince.buffStacks === undefined ? {} : { buffStacks: prince.buffStacks }),
      ...(prince.shuffleResist === undefined ? {} : { shuffleResist: prince.shuffleResist }),
    },
    target: skillTargetView(offender, battle),
    areaDistance,
    light: battle.light,
    targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
    guardedHeroOmitted:
      !offender.guard &&
      battle.entities.some((entry) => entry.side === "hero" && !entry.dead && entry.guard),
    untargetedHeroesBesideTarget: battle.entities
      .filter(
        (entry) =>
          entry.side === "hero" &&
          !entry.dead &&
          entry.id !== offender.id &&
          entry.areaId === offender.areaId,
      )
      .map((entry) => ({ ...entry, stress: entry.stress! })),
    threatFlatDamageBonus: monsterCombatThreatDamageBonus(state.dungeon, card),
  };

  const resolved = resolveMonsterSkill(card, skillSlot, combat, roll);
  if (resolved.status === "refused") {
    return { state, events: [{ type: "commandRefused", message: resolved.reason }] };
  }
  const effects = resolveMonsterSkillEffects(card, skillSlot, combat, roll);
  if (effects.status === "refused") {
    return { state, events: [{ type: "commandRefused", message: effects.reason }] };
  }
  if (resolved.resolution.skipped.length) {
    return {
      state,
      events: [
        { type: "commandRefused", message: "Enraged Destruction：技能效果未全接入（R-048）" },
      ],
    };
  }

  let entities = battle.entities.map((entry) => {
    const updated = writeResolution(entry, prince.id, offender.id, resolved.resolution, false);
    return entry.id === prince.id ? { ...updated, dead: resolved.actorDead } : updated;
  });
  const health = applySkillHealth(
    { ...battle, entities, rngCursor: cursor },
    entities,
    effects,
    state.seed,
    cursor,
  );
  if (health.status === "refused") {
    return { state, events: [{ type: "commandRefused", message: health.reason }] };
  }

  const skillEvent: MonsterSkillResolvedEvent = {
    type: "monsterSkillResolved",
    message: "Swine Prince I · Enraged Destruction 已结算",
    actorId: prince.id,
    skillSlot,
    roll,
    actorDead: resolved.actorDead,
    resolution: resolved.resolution,
  };

  return {
    state: {
      ...state,
      battle: {
        ...battle,
        entities: health.entities,
        rngCursor: health.rngCursor,
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Swine Prince I · Enraged Destruction：Wilbur 受伤 → Prince 反击 ${offender.id}（slot ${skillSlot}）`,
      },
      skillEvent,
      ...health.events,
    ],
  };
}

/** 英雄技能结算后链接 Enraged Destruction（Wilbur 伤口增加且 Prince 在场）。 */
export function chainSwinePrinceIEnragedDestructionAfterHeroSkill(
  result: ApplyResult,
  beforeEntities: readonly BattleEntity[],
  heroActorId: string,
): ApplyResult {
  if (result.events.some((event) => event.type === "commandRefused")) return result;
  const battle = result.state.battle;
  if (!battle?.encounter) return result;
  if (!wilburWoundsIncreased(beforeEntities, battle.entities)) return result;
  const enraged = applySwinePrinceIEnragedDestruction(result.state, heroActorId);
  if (enraged.events.some((event) => event.type === "commandRefused")) return enraged;
  return {
    state: enraged.state,
    events: [...result.events, ...enraged.events],
  };
}
