import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameEvent, GameState, MonsterSkillResolvedEvent } from "../command";
import { applySkillHealth } from "../battle-health";
import { skillTargetView, writeResolution, distance, rejectBattleCommand } from "../battle";
import { nextBattleRoll, finishTurn } from "../encounter";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_RUBBLE_SKILL_SLOT,
  PROPHET_I_SCRIPT_ID,
  PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID,
  prophetRoomMarkerForD10Roll,
  type ProphetRoomD10Marker,
} from "./prophet-i";
import { readBossCombatEntry } from "./combat-entry";
import { getBossScript } from "./registry";
import { defaultMonsterTurnActionCount } from "./hooks";
import type { BossScriptDefinition, BossSummonOk, ProphetWoodenPewIndex } from "./types";
import type { SkillStance } from "../hero-skill";
import { resolveMonsterSkill, resolveMonsterSkillEffects } from "../monster-skill";
import { monsterCombatThreatDamageBonus } from "./threat-passive-runtime";
import { readProphetIRoomD10Binding } from "./prophet-i-room-runtime";

const PEW_INDICES: readonly ProphetWoodenPewIndex[] = [0, 1, 2, 3];
const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

/** 每轮第 1 / 2 / 3 次先知行动在 `prophetActionsThisRound` 上的索引（0-based，行动前）。 */
export const PROPHET_I_FIRST_ACTION_INDEX = 0 as const;
export const PROPHET_I_SECOND_ACTION_INDEX = 1 as const;
export const PROPHET_I_THIRD_ACTION_INDEX = 2 as const;

export type InitiativeSide = "hero" | "monster";

/** R38：单只 Prophet I 时先攻堆补足至 `printedInitiativeCards`（3）；多怪伴战 hold。 */
export function expandProphetIInitiativeDeckSides(
  deck: readonly InitiativeSide[],
  battle: BattleState,
  state: GameState,
): InitiativeSide[] {
  if (resolveEncounterBossScriptId(state) !== PROPHET_I_SCRIPT_ID) return [...deck];
  const script = getBossScript(PROPHET_I_SCRIPT_ID);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry) return [...deck];
  const livingMonsters = battle.entities.filter(
    (entity) => entity.side === "monster" && !entity.dead,
  );
  if (
    livingMonsters.length !== 1 ||
    livingMonsters[0]!.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID
  ) {
    return [...deck];
  }
  const extra = entry.printedInitiativeCards - livingMonsters.length;
  if (extra <= 0) return [...deck];
  return [...deck, ...Array.from({ length: extra }, (): InitiativeSide => "monster")];
}

/** 第 2 行动走卡面姿态骰表选招（R38–R39；仅第 1 / 3 行动有特殊替代）。 */
export function prophetSecondActionUsesDefaultSkillSelection(
  battle: BattleState,
  actorId: string,
): boolean {
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.dead || actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID) {
    return false;
  }
  return prophetActionIndexBeforeTurn(battle) === PROPHET_I_SECOND_ACTION_INDEX;
}

/** 多行动轮内：完成 3 次先知行动后再记入 `actedIds`（配合先攻 3 张）。 */
export function prophetShouldEnterActedIdsAfterTurn(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter) return true;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.side !== "monster") return true;
  if (resolveEncounterBossScriptId(state) !== PROPHET_I_SCRIPT_ID) return true;
  if (actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID) return true;
  const script = getBossScript(PROPHET_I_SCRIPT_ID);
  if (!script) return true;
  const budget = defaultMonsterTurnActionCount(script, {
    scriptId: PROPHET_I_SCRIPT_ID,
    monsterEntityId: actorId,
    round: battle.encounter.round,
  });
  if (budget.status !== "ok" || budget.value <= 1) return true;
  return (battle.prophetActionsThisRound ?? 0) >= budget.value;
}

export function readProphetICalamitousEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== PROPHET_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "calamitousPrognostication", {
    scriptId: script.id,
    monsterEntityId: "prophet",
    round: 1,
  });
  return (
    result.status === "ok" &&
    result.effect === "rollFourD10PlaceWoodenPewsOnFirstActionEachRound" &&
    result.pewCount === 4
  );
}

export function readProphetIRubbleEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== PROPHET_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "rubbleOfRuin", {
    scriptId: script.id,
    monsterEntityId: "prophet",
    round: 1,
  });
  return (
    result.status === "ok" &&
    result.effect === "useRubbleSkillOnThirdActionEachRound" &&
    result.skillSlot === PROPHET_I_RUBBLE_SKILL_SLOT
  );
}

export function prophetActionIndexBeforeTurn(battle: BattleState): number {
  return battle.prophetActionsThisRound ?? 0;
}

export function bumpProphetIActionRoundCount(state: GameState, actorId: string): GameState {
  const battle = state.battle;
  if (!battle?.encounter) return state;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID
  ) {
    return state;
  }
  if (resolveEncounterBossScriptId(state) !== PROPHET_I_SCRIPT_ID) return state;
  const count = battle.prophetActionsThisRound ?? 0;
  return { ...state, battle: { ...battle, prophetActionsThisRound: count + 1 } };
}

export function readProphetIWwoodenPewPlan(
  script: BossScriptDefinition,
  pewIndex: ProphetWoodenPewIndex,
): BossSummonOk["value"] | null {
  if (script.id !== PROPHET_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "calamitousWoodenPew",
    woodenPewIndex: pewIndex,
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function resolveProphetAreaIdForD10Roll(
  roll: number,
  table: BattleState["prophetRoomD10AreaTable"],
): string | null {
  if (!table?.length) return null;
  const marker = prophetRoomMarkerForD10Roll(roll);
  if (!marker) return null;
  const bindings = table.filter((entry) => entry.marker === marker);
  return bindings.length === 1 ? bindings[0]!.areaId || null : null;
}

function prophetEntity(battle: BattleState) {
  return battle.entities.find(
    (entity) =>
      entity.side === "monster" &&
      !entity.dead &&
      entity.monsterCardId === PROPHET_I_COMBAT_MONSTER_CARD_ID,
  );
}

export function prophetCalamitousShouldReplaceSkill(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;
  if (battle.prophetCalamitousUsedThisRound) return false;
  if (prophetActionIndexBeforeTurn(battle) !== PROPHET_I_FIRST_ACTION_INDEX) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readProphetICalamitousEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID || actor.dead) {
    return false;
  }
  // R38：第 1 行动必须尝试 Calamitous；缺表由结算入口拒绝，不能退回普通技能。
  return true;
}

/** Prophet I · Calamitous Prognostication：每轮首次行动掷 4d10，按 room 标记写入 Wooden Pew（区域语义）。 */
export function applyProphetCalamitousPrognostication(
  state: GameState,
  actorId: string,
): ApplyResult {
  const battle = state.battle!;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || script.id !== PROPHET_I_SCRIPT_ID) {
    return { state, events: [] };
  }
  if (!prophetEntity(battle)) return { state, events: [] };
  if (battle.prophetCalamitousUsedThisRound) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Calamitous：本回合已执行（R-048）" }],
    };
  }

  const binding = readProphetIRoomD10Binding(state);
  if (binding.status === "refused") return rejectBattleCommand(state, binding.message);
  if (binding.status !== "ready") return { state, events: [] };
  const table = binding.table;

  let cursor = battle.rngCursor;
  const rolls: number[] = [];
  const pewPlacements: { readonly areaId: string; readonly pewIndex: ProphetWoodenPewIndex }[] = [];

  for (const pewIndex of PEW_INDICES) {
    const plan = readProphetIWwoodenPewPlan(script, pewIndex);
    if (
      !plan ||
      plan.summonMonsterCardId !== PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID ||
      plan.miniaturePlacement !== "areaD10Marker"
    ) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Calamitous：木长椅 ${pewIndex} 召唤计划未核实（R-048）`,
          },
        ],
      };
    }
    const roll = nextBattleRoll(state.seed, cursor);
    cursor += 1;
    rolls.push(roll);
    const areaId = resolveProphetAreaIdForD10Roll(roll, table);
    if (!areaId) {
      return {
        state,
        events: [
          {
            type: "commandRefused",
            message: `Calamitous：d10=${roll} 无对应区域（R-048；room 绑定 hold）`,
          },
        ],
      };
    }
    pewPlacements.push({ areaId, pewIndex });
  }

  const markers = rolls.map((roll) => prophetRoomMarkerForD10Roll(roll)).filter(Boolean);
  const nextBattle: BattleState = {
    ...battle,
    rngCursor: cursor,
    woodenPews: pewPlacements,
    prophetCalamitousUsedThisRound: true,
    monsterAction: null,
  };

  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    {
      type: "dungeonUpdated",
      message: `Prophet I · Calamitous Prognostication：Wooden Pew 区域 d10（rolls=${rolls.join(",")}；markers=${markers.join("|")}）`,
    },
  ]);
}

export function prophetRubbleShouldReplaceSkill(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;
  if (prophetActionIndexBeforeTurn(battle) !== PROPHET_I_THIRD_ACTION_INDEX) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readProphetIRubbleEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID || actor.dead) {
    return false;
  }
  return true;
}

function rubbleTargetHeroInArea(battle: BattleState, areaId: string): BattleEntity | null {
  const heroes = battle.entities.filter(
    (entity) => entity.side === "hero" && !entity.dead && entity.areaId === areaId,
  );
  if (!heroes.length) return null;
  if (heroes.some((hero) => !hero.stance || !STANCES.includes(hero.stance))) return null;
  return [...heroes].sort(
    (a, b) =>
      Number(b.guard) - Number(a.guard) || STANCES.indexOf(a.stance!) - STANCES.indexOf(b.stance!),
  )[0]!;
}

/** Prophet I · Rubble of Ruin：每轮第 3 次行动；每个 Wooden Pew 独立掷攻击（同区多英雄 hold）。 */
export function applyProphetRubbleOfRuin(state: GameState, actorId: string): ApplyResult {
  const battle = state.battle!;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || script.id !== PROPHET_I_SCRIPT_ID) {
    return { state, events: [] };
  }
  if (!prophetEntity(battle)) return { state, events: [] };
  if (prophetActionIndexBeforeTurn(battle) !== PROPHET_I_THIRD_ACTION_INDEX) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Rubble：非第 3 次行动（R-048）" }],
    };
  }

  const actor = battle.entities.find((entity) => entity.id === actorId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (!actor || !card || card.verification.unverified) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Rubble：先知卡未核实（R-048）" }],
    };
  }
  if (actor.life !== card.life) {
    return { state, events: [{ type: "commandRefused", message: "Rubble：Life 不一致（R-048）" }] };
  }

  const pews = battle.woodenPews ?? [];
  let cursor = battle.rngCursor;
  let entities = battle.entities;
  const events: GameEvent[] = [];
  const skillEvents: MonsterSkillResolvedEvent[] = [];
  let pewAttacks = 0;

  const heights = { low: 0, normal: 1, high: 2 };
  const threatBonus = monsterCombatThreatDamageBonus(state.dungeon, card);

  for (const pew of pews) {
    const target = rubbleTargetHeroInArea({ ...battle, entities }, pew.areaId);
    if (!target) continue;
    const actorArea = battle.areas.find((entry) => entry.id === actor.areaId);
    const targetArea = battle.areas.find((entry) => entry.id === target.areaId);
    if (!actorArea || !targetArea) {
      return {
        state,
        events: [{ type: "commandRefused", message: "Rubble：区域几何未核实（R-048）" }],
      };
    }
    const areaDistance =
      actor.areaId === target.areaId ? 0 : distance(battle.areas, actor.areaId, target.areaId);
    if (areaDistance === null) {
      return {
        state,
        events: [{ type: "commandRefused", message: "Rubble：先知与木长椅区域不可达（R-048）" }],
      };
    }

    const roll = nextBattleRoll(state.seed, cursor);
    cursor += 1;
    const combat = {
      actor: {
        id: actor.id,
        wounds: actor.wounds,
        ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
        ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
      },
      target: skillTargetView(target, { ...battle, entities }),
      areaDistance,
      light: battle.light,
      targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
      guardedHeroOmitted:
        !target.guard &&
        entities.some((entry) => entry.side === "hero" && !entry.dead && entry.guard),
      untargetedHeroesBesideTarget: entities
        .filter(
          (entry) =>
            entry.side === "hero" &&
            !entry.dead &&
            entry.id !== target.id &&
            entry.areaId === target.areaId,
        )
        .map((entry) => ({ ...entry, stress: entry.stress! })),
      threatFlatDamageBonus: threatBonus,
    };
    const resolved = resolveMonsterSkill(card, PROPHET_I_RUBBLE_SKILL_SLOT, combat, roll);
    if (resolved.status === "refused") {
      return { state, events: [{ type: "commandRefused", message: resolved.reason }] };
    }
    const effects = resolveMonsterSkillEffects(card, PROPHET_I_RUBBLE_SKILL_SLOT, combat, roll);
    if (effects.status === "refused") {
      return { state, events: [{ type: "commandRefused", message: effects.reason }] };
    }
    if (resolved.resolution.skipped.length) {
      return {
        state,
        events: [{ type: "commandRefused", message: "Rubble：技能效果未全接入（R-048）" }],
      };
    }
    entities = entities.map((entry) => {
      const updated = writeResolution(entry, actor.id, target.id, resolved.resolution, false);
      return entry.id === actor.id ? { ...updated, dead: resolved.actorDead } : updated;
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
    entities = health.entities;
    cursor = health.rngCursor;
    pewAttacks += 1;
    skillEvents.push({
      type: "monsterSkillResolved",
      message: `Rubble · pew ${pew.pewIndex} → ${target.id}`,
      actorId: actor.id,
      skillSlot: PROPHET_I_RUBBLE_SKILL_SLOT,
      roll,
      actorDead: resolved.actorDead,
      resolution: resolved.resolution,
    });
  }

  const nextBattle: BattleState = {
    ...battle,
    entities,
    rngCursor: cursor,
    monsterAction: null,
  };

  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    ...events,
    ...skillEvents,
    {
      type: "dungeonUpdated",
      message: `Prophet I · Rubble of Ruin：${pewAttacks}/${pews.length} 木长椅攻击（slot=${PROPHET_I_RUBBLE_SKILL_SLOT}；同区多目标 / 空区 hold）`,
    },
  ]);
}

export function prophetRoomD10AreaTableFromMarkers(
  markerToAreaId: Readonly<Record<ProphetRoomD10Marker, string>>,
): readonly { readonly marker: string; readonly areaId: string }[] {
  return Object.entries(markerToAreaId).map(([marker, areaId]) => ({ marker, areaId }));
}

export function countWoodenPewsInArea(battle: BattleState, areaId: string): number {
  return (battle.woodenPews ?? []).filter((pew) => pew.areaId === areaId).length;
}
