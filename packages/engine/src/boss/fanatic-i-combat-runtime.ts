import {
  RUINS_COMBAT_LEVELS,
  ruinsCombatForScript,
  isRuinsCombatCard,
} from "./ruins-combat-levels";
import { distance, type BattleEntity, type BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import type { SkillTargetSide } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { defaultMonsterTurnActionCount, runBossHook } from "./hooks";
import { readBossCombatEntry } from "./combat-entry";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk } from "./types";

function pyreCardId(battle: BattleState) {
  const boss = battle.entities.find((e) => isRuinsCombatCard("fanatic", e.monsterCardId));
  return RUINS_COMBAT_LEVELS.fanatic.find((e) => e.card === boss?.monsterCardId)?.pyre;
}

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** R39：Fanatic 被击败后移出仍在场的 Pyre；保留原伤口与日志身份。 */
export function clearFanaticIPyre(result: ApplyResult, ids: readonly string[]) {
  const battle = result.state.battle!;
  if (
    !ruinsCombatForScript("fanatic", resolveEncounterBossScriptId(result.state)) ||
    !battle.entities.some(
      (e) =>
        e.side === "monster" &&
        isRuinsCombatCard("fanatic", e.monsterCardId) &&
        e.dead &&
        ids.includes(e.id),
    )
  )
    return { result, ids };
  const pyres = battle.entities.filter(
    (e) => e.side === "monster" && e.monsterCardId === pyreCardId(battle) && !e.dead,
  );
  if (!pyres.length) return { result, ids };
  return {
    ids: [...ids, ...pyres.map((e) => e.id)],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...battle,
          entities: battle.entities.map((e) => (pyres.includes(e) ? { ...e, dead: true } : e)),
        },
      },
      events: [
        ...result.events,
        { type: "dungeonUpdated" as const, message: "Fanatic I 被击败：移出火刑架 Pyre（R39）" },
      ],
    },
  };
}

export type InitiativeSide = SkillTargetSide;

/** spec §14.5 R39：Fanatic 3 + Pyre 1 共 4 张 monster 先攻（2 实体 + 2 洗入）。 */
export function expandFanaticIInitiativeDeckSides(
  deck: readonly InitiativeSide[],
  battle: BattleState,
  state: GameState,
): InitiativeSide[] {
  if (!ruinsCombatForScript("fanatic", resolveEncounterBossScriptId(state))) return [...deck];
  const script = getBossScript(resolveEncounterBossScriptId(state)!);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry) return [...deck];
  const livingMonsters = battle.entities.filter(
    (entity) => entity.side === "monster" && !entity.dead,
  );
  if (livingMonsters.length !== 2) return [...deck];
  const cardIds = new Set(livingMonsters.map((entity) => entity.monsterCardId));
  if (!cardIds.has(entry.combatMonsterCardId) || !cardIds.has(pyreCardId(battle))) {
    return [...deck];
  }
  const monsterSides = deck.filter((side) => side === "monster").length;
  const extra = entry.printedInitiativeCards - monsterSides;
  if (extra <= 0) return [...deck];
  return [...deck, ...Array.from({ length: extra }, (): InitiativeSide => "monster")];
}

export function readFanaticIPyreBattleStartPlan(
  script: BossScriptDefinition,
): BossSummonOk["value"] | null {
  if (!ruinsCombatForScript("fanatic", script.id)) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "battleStartPyre",
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function readFanaticISentenceRenderedEnabled(script: BossScriptDefinition): boolean {
  if (!ruinsCombatForScript("fanatic", script.id)) return false;
  const result = runBossHook(script, "sentenceRendered", {
    scriptId: script.id,
    monsterEntityId: "fanatic",
    round: 1,
  });
  return result.status === "ok" && result.effect === "moveTowardClosestHeroOrTossIntoPyreArea";
}

export function readFanaticIPitTossEnabled(script: BossScriptDefinition): boolean {
  if (!ruinsCombatForScript("fanatic", script.id)) return false;
  const result = runBossHook(script, "pitToss", {
    scriptId: script.id,
    monsterEntityId: "fanatic",
    round: 1,
  });
  return result.status === "ok" && result.effect === "tossReachHeroIntoPyreArea";
}

/** 多行动轮内：Fanatic 完成 3 次行动后再记入 `actedIds`（配合先攻 3 张 Fanatic 语义）。 */
export function fanaticShouldEnterActedIdsAfterTurn(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter) return true;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.side !== "monster") return true;
  if (!ruinsCombatForScript("fanatic", resolveEncounterBossScriptId(state))) return true;
  if (!isRuinsCombatCard("fanatic", actor.monsterCardId)) return true;
  const script = getBossScript(resolveEncounterBossScriptId(state)!);
  if (!script) return true;
  const budget = defaultMonsterTurnActionCount(script, {
    scriptId: script.id,
    monsterEntityId: actorId,
    round: battle.encounter.round,
  });
  if (budget.status !== "ok" || budget.value <= 1) return true;
  return (battle.fanaticActionsThisRound ?? 0) >= budget.value;
}

export function bumpFanaticIActionRoundCount(state: GameState, actorId: string): GameState {
  const battle = state.battle;
  if (!battle?.encounter) return state;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || !isRuinsCombatCard("fanatic", actor.monsterCardId)) return state;
  if (!ruinsCombatForScript("fanatic", resolveEncounterBossScriptId(state))) return state;
  const count = battle.fanaticActionsThisRound ?? 0;
  return { ...state, battle: { ...battle, fanaticActionsThisRound: count + 1 } };
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function pyreEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find((entity) => entity.monsterCardId === pyreCardId(battle));
}

function fanaticEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find((entity) =>
    isRuinsCombatCard("fanatic", entity.monsterCardId),
  );
}

function areaOccupancy(battle: BattleState, areaId: string): number {
  return battle.entities
    .filter((entity) => !entity.dead && entity.areaId === areaId)
    .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0);
}

export function pyreAreaHasSpaceForHero(battle: BattleState, pyre: BattleEntity): boolean {
  const area = battle.areas.find((entry) => entry.id === pyre.areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return false;
  return areaOccupancy(battle, pyre.areaId) + 1 <= area.capacity!;
}

function readPyreCard(battle: BattleState): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === pyreCardId(battle));
  if (!card || card.verification.unverified) return null;
  if (!Number.isInteger(card.life) || card.life < 0) return null;
  return card;
}

function stanceAreaId(battle: BattleState, stance: (typeof STANCES)[number]): string | null {
  const hero = battle.entities.find(
    (entity) => entity.side === "hero" && !entity.dead && entity.stance === stance,
  );
  return hero?.areaId ?? null;
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

/** Fanatic I · Pyre：Boss 战 `startBattle` 前写入 Pyre 实体（远程姿态 + 对应区域）。 */
export function applyFanaticIPyreBattleStart(state: GameState): ApplyResult {
  const battle = state.battle;
  const d = state.dungeon;
  if (!battle || !d) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (!ruinsCombatForScript("fanatic", scriptId)) return { state, events: [] };
  const script = getBossScript(scriptId!);
  if (!script) return { state, events: [] };
  if (!fanaticEntity(battle)) return { state, events: [] };
  if (pyreEntity(battle)) return { state, events: [] };

  const plan = readFanaticIPyreBattleStartPlan(script);
  if (!plan || plan.summonMonsterCardId !== pyreCardId(battle)) {
    return { state, events: [] };
  }
  const fixedStance = plan.fixedStance ?? "ranged";
  if (fixedStance !== "ranged") {
    return {
      state,
      events: [{ type: "commandRefused", message: "Fanatic Pyre 开局姿态未核实（R-048）" }],
    };
  }

  const card = readPyreCard(battle);
  if (!card) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Fanatic Pyre 缺少已核实 monster_large:p011，不能猜开战布置（R-048）",
        },
      ],
    };
  }

  const position = STANCES.indexOf("ranged");
  const width = 2 as const;
  if (!stanceTrackFree(battle, position, width)) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Fanatic Pyre 远程姿态轨无 2 格空间，不能猜开战布置（R-048）",
        },
      ],
    };
  }

  const areaId = stanceAreaId(battle, "ranged");
  if (!areaId || !battle.areas.some((area) => area.id === areaId)) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Fanatic Pyre 缺远程姿态对应区域，不能猜落点（R-048）",
        },
      ],
    };
  }

  const pyreId = "boss:fanatic:pyre";
  const dodge =
    (card as MonsterCardView & { readonly dodge?: number }).dodge ??
    (card as { readonly dodge?: number }).dodge ??
    0;
  const entity: BattleEntity = {
    id: pyreId,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId,
    stance: "ranged",
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
        message: `Fanatic I · Pyre：远程姿态开局写入 ${pyreId}（${areaId}；${script.displayName}）`,
      },
    ],
  };
}

function closestLivingHero(battle: BattleState, fromAreaId: string): BattleEntity | null {
  const heroes = battle.entities.filter((entity) => entity.side === "hero" && !entity.dead);
  let best: BattleEntity | null = null;
  let bestDistance = Infinity;
  for (const hero of heroes) {
    const steps = distance(battle.areas, fromAreaId, hero.areaId);
    if (steps === null) continue;
    if (steps < bestDistance) {
      bestDistance = steps;
      best = hero;
    }
  }
  return best;
}

export function fanaticSentenceRenderedShouldReplaceSkill(
  state: GameState,
  actorId: string,
): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readFanaticISentenceRenderedEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || !isRuinsCombatCard("fanatic", actor.monsterCardId) || actor.dead) {
    return false;
  }

  const pyre = pyreEntity(battle);
  if (!pyre || !pyreAreaHasSpaceForHero(battle, pyre)) return false;
  return closestLivingHero(battle, actor.areaId) !== null;
}

function nextAreaTowardHero(
  battle: BattleState,
  originId: string,
  heroAreaId: string,
): string | null {
  const current = distance(battle.areas, originId, heroAreaId);
  if (current === null) return null;
  const origin = battle.areas.find((area) => area.id === originId);
  if (!origin) return null;
  const candidates = origin.adjacent
    .map((id) => ({ id, steps: distance(battle.areas, id, heroAreaId) }))
    .filter((entry): entry is { id: string; steps: number } => entry.steps !== null);
  if (!candidates.length) return null;
  const best = Math.min(...candidates.map((entry) => entry.steps));
  const tied = candidates.filter((entry) => entry.steps === best && entry.steps < current);
  tied.sort((left, right) => left.id.localeCompare(right.id));
  return tied[0]?.id ?? null;
}

/**
 * Fanatic Pit Toss（hold 文档用语）：boss_ability Sentence Rendered 同区分支——
 * 将目标英雄棋子移到 Pyre 所在区域（非 Templar Impaler d10 尖刺坑）。
 */
export function applyFanaticPitTossHeroIntoPyreArea(
  state: GameState,
  fanaticId: string,
  heroId: string,
): ApplyResult {
  const battle = state.battle!;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readFanaticIPitTossEnabled(script)) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Fanatic Pit Toss 未声明（R-048）" }],
    };
  }
  const actor = battle.entities.find((entity) => entity.id === fanaticId);
  const hero = battle.entities.find((entity) => entity.id === heroId);
  const pyre = pyreEntity(battle);
  if (!actor || !hero || !pyre || actor.areaId !== hero.areaId) {
    return {
      state,
      events: [
        { type: "commandRefused", message: "Fanatic Pit Toss：需 Fanatic 与英雄同区（R-048）" },
      ],
    };
  }
  if (!pyreAreaHasSpaceForHero(battle, pyre)) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Fanatic Pit Toss：Pyre 区域无空间（R-048）" }],
    };
  }
  const entities = battle.entities.map((entity) =>
    entity.id === hero.id ? { ...entity, areaId: pyre.areaId } : entity,
  );
  return finishTurn({ ...state, battle: { ...battle, entities, monsterAction: null } }, fanaticId, [
    {
      type: "dungeonUpdated",
      message: `Fanatic I · Pit Toss：${hero.id} 丢入 Pyre 区域 ${pyre.areaId}`,
    },
  ]);
}

/** Sentence Rendered：同区丢入 Pyre 区域，否则向最近英雄移动一步并结束本怪物回合。 */
export function applyFanaticSentenceRendered(state: GameState, actorId: string): ApplyResult {
  const battle = state.battle!;
  const actor = battle.entities.find((entity) => entity.id === actorId)!;
  const hero = closestLivingHero(battle, actor.areaId)!;

  if (actor.areaId === hero.areaId) {
    return applyFanaticPitTossHeroIntoPyreArea(state, actorId, hero.id);
  }

  const nextArea = nextAreaTowardHero(battle, actor.areaId, hero.areaId);
  if (!nextArea) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Sentence Rendered：无法向最近英雄移动（R-048）",
        },
      ],
    };
  }

  const area = battle.areas.find((entry) => entry.id === nextArea)!;
  const occupied = areaOccupancy(battle, nextArea);
  if (!Number.isSafeInteger(area.capacity) || occupied + actor.stanceSlots! > area.capacity!) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Sentence Rendered：落点区域容量不足（R-048）",
        },
      ],
    };
  }

  const entities = battle.entities.map((entity) =>
    entity.id === actorId ? { ...entity, areaId: nextArea } : entity,
  );
  const moved = finishTurn(
    { ...state, battle: { ...battle, entities, monsterAction: null } },
    actorId,
    [
      {
        type: "dungeonUpdated",
        message: `Fanatic I · Sentence Rendered：${actorId} ${actor.areaId}→${nextArea} 靠近 ${hero.id}`,
      },
    ],
  );
  return moved;
}
