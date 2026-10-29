import type { BattleEntity, BattleState } from "../battle";
import type {
  ApplyResult,
  GameEvent,
  GameState,
  MonsterSkillTargetsResolvedEvent,
} from "../command";
import { applySkillHealth } from "../battle-health";
import { skillTargetView, writeResolution, distance, rejectBattleCommand } from "../battle";
import {
  nextBattleRoll,
  finishTurn,
  newlyDefeatedIds,
  removeCasualties,
  endAfterCasualties,
} from "../encounter";
import { resolveBattlePressure } from "../pressure";
import { multiTargetHealthEffects, projectActorWounds } from "../skill-actor-health";
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
import { resolveMonsterSkillEffects } from "../monster-skill";
import { monsterCombatThreatDamageBonus } from "./threat-passive-runtime";
import { readProphetIRoomD10Binding } from "./prophet-i-room-runtime";

const PEW_INDICES: readonly ProphetWoodenPewIndex[] = [0, 1, 2, 3];
const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

/** 每轮第 1 / 2 / 3 次先知行动在 `prophetActionsThisRound` 上的索引（0-based，行动前）。 */
export const PROPHET_I_FIRST_ACTION_INDEX = 0 as const;
export const PROPHET_I_SECOND_ACTION_INDEX = 1 as const;
export const PROPHET_I_THIRD_ACTION_INDEX = 2 as const;

export type InitiativeSide = "hero" | "monster";

/** R30、R38：Prophet 的一张基础先攻补至三张，伴战怪物各自的先攻保留。 */
export function expandProphetIInitiativeDeckSides(
  deck: readonly InitiativeSide[],
  battle: BattleState,
  state: GameState,
): InitiativeSide[] {
  if (resolveEncounterBossScriptId(state) !== PROPHET_I_SCRIPT_ID) return [...deck];
  const script = getBossScript(PROPHET_I_SCRIPT_ID);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry) return [...deck];
  if (!prophetEntity(battle)) return [...deck];
  const extra = entry.printedInitiativeCards - 1;
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

function rubbleTargetsInArea(battle: BattleState, areaId: string): BattleEntity[] {
  const heroes = battle.entities.filter(
    (entity) => entity.side === "hero" && !entity.dead && entity.areaId === areaId,
  );
  return [...heroes].sort(
    (a, b) =>
      Number(b.guard) - Number(a.guard) || STANCES.indexOf(a.stance!) - STANCES.indexOf(b.stance!),
  );
}

/** R19、R38–39：每张木长椅独立攻击所在区域；该区存活英雄共享一次攻击骰。 */
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
  if (!actor || actor.id !== prophetEntity(battle)?.id || !card || card.verification.unverified) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Rubble：先知卡未核实（R-048）" }],
    };
  }
  if (actor.life !== card.life) {
    return { state, events: [{ type: "commandRefused", message: "Rubble：Life 不一致（R-048）" }] };
  }

  const pews = battle.woodenPews ?? [];
  let next = battle;
  let events: readonly GameEvent[] = [];
  let pewAttacks = 0;

  const heights = { low: 0, normal: 1, high: 2 };
  const threatBonus = monsterCombatThreatDamageBonus(state.dungeon, card);

  for (const pew of pews) {
    const targets = rubbleTargetsInArea(next, pew.areaId);
    const actorArea = next.areas.find((entry) => entry.id === actor.areaId);
    const targetArea = next.areas.find((entry) => entry.id === pew.areaId);
    if (!actorArea || !targetArea) {
      return {
        state,
        events: [{ type: "commandRefused", message: "Rubble：区域几何未核实（R-048）" }],
      };
    }
    if (!targets.length) {
      // R19 允许空区；R38 仍要求每张木长椅单独掷骰。
      const roll = nextBattleRoll(state.seed, next.rngCursor);
      next = { ...next, rngCursor: next.rngCursor + 1 };
      events = [
        ...events,
        {
          type: "dungeonUpdated",
          message: `Rubble · pew ${pew.pewIndex} → ${pew.areaId}：骰 ${roll}，区域内无存活英雄`,
        },
      ];
      pewAttacks += 1;
      continue;
    }
    if (targets.some((hero) => !hero.stance || !STANCES.includes(hero.stance)))
      return rejectBattleCommand(state, "Rubble：同区英雄缺少已核实姿态（R19、R-048）");
    const areaDistance = distance(next.areas, actor.areaId, pew.areaId);
    if (areaDistance === null) {
      return {
        state,
        events: [{ type: "commandRefused", message: "Rubble：先知与木长椅区域不可达（R-048）" }],
      };
    }

    const currentActor = next.entities.find((entity) => entity.id === actorId)!;
    const roll = nextBattleRoll(state.seed, next.rngCursor);
    const results = targets.map((target) =>
      resolveMonsterSkillEffects(
        card,
        PROPHET_I_RUBBLE_SKILL_SLOT,
        {
          actor: {
            id: actor.id,
            wounds: currentActor.wounds,
            ...(currentActor.buffStacks === undefined
              ? {}
              : { buffStacks: currentActor.buffStacks }),
            ...(currentActor.shuffleResist === undefined
              ? {}
              : { shuffleResist: currentActor.shuffleResist }),
          },
          target: skillTargetView(target, next),
          areaDistance,
          targetsInArea: targets.length,
          light: next.light,
          targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
          // Special 直接攻击木长椅区域；该区全部存活英雄均已选中（R38–39）。
          guardedHeroOmitted: false,
          untargetedHeroesBesideTarget: [],
          threatFlatDamageBonus: threatBonus,
        },
        roll,
      ),
    );
    const resultsOk = results.filter((result) => result.status === "resolved");
    const refused = results.find((result) => result.status === "refused");
    if (refused) return rejectBattleCommand(state, refused.reason);
    if (resultsOk.some((result) => result.resolution.skipped.length))
      return rejectBattleCommand(state, "Rubble：技能效果未全接入（R-048）");
    const resolutions = resultsOk.map((result) => result.resolution);
    const representative =
      resolutions.find((result) => result.outcome === "crit") ?? resolutions[0]!;
    const healthEffects = multiTargetHealthEffects(resultsOk);
    const actorWounds = projectActorWounds(actorId, currentActor.wounds, healthEffects);
    const actorDead = actorWounds >= card.life;
    const entities = next.entities.map((entry) => {
      const resolution =
        resolutions.find((result) => result.targetId === entry.id) ?? representative;
      const updated = writeResolution(
        entry,
        actorId,
        resolution.targetId,
        { ...resolution, actorWounds },
        false,
      );
      return entry.id === actorId ? { ...updated, dead: actorDead } : updated;
    });
    const health = applySkillHealth(
      next,
      entities,
      { resolution: representative, healthEffects },
      state.seed,
      next.rngCursor + 1,
    );
    if (health.status === "refused") {
      return { state, events: [{ type: "commandRefused", message: health.reason }] };
    }
    pewAttacks += 1;
    const skillEvent: MonsterSkillTargetsResolvedEvent = {
      type: "monsterSkillTargetsResolved",
      message: `Rubble · pew ${pew.pewIndex} → ${pew.areaId}（${targets.map((target) => target.id).join(",")}）`,
      actorId: actor.id,
      skillSlot: PROPHET_I_RUBBLE_SKILL_SLOT,
      roll,
      actorDead,
      resolutions,
    };
    const pressure = resolveBattlePressure({
      state: {
        ...state,
        battle: {
          ...next,
          entities: health.entities,
          rngCursor: health.rngCursor,
          monsterAction: null,
        },
      },
      events: [...events, skillEvent, ...health.events],
    });
    const problem = pressure.events.find((event) => event.type === "commandRefused");
    if (problem) return rejectBattleCommand(state, problem.message);
    const removed = removeCasualties(
      pressure,
      newlyDefeatedIds(next, pressure.state.battle!.entities),
    );
    const ended = endAfterCasualties(removed);
    if (ended) return ended;
    next = removed.state.battle!;
    events = removed.events;
    if (actorDead) break;
  }

  const nextBattle: BattleState = {
    ...next,
    monsterAction: null,
  };

  return finishTurn({ ...state, battle: nextBattle }, actorId, [
    ...events,
    {
      type: "dungeonUpdated",
      message: `Prophet I · Rubble of Ruin：${pewAttacks}/${pews.length} 木长椅区域攻击（slot=${PROPHET_I_RUBBLE_SKILL_SLOT}；每区目标共享骰，空区无英雄受击）`,
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
