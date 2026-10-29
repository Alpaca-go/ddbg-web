import type { BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { nextBattleRoll, finishTurn } from "../encounter";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID,
  prophetRoomMarkerForD10Roll,
  type ProphetRoomD10Marker,
} from "./prophet-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk, ProphetWoodenPewIndex } from "./types";

const PEW_INDICES: readonly ProphetWoodenPewIndex[] = [0, 1, 2, 3];

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
  const binding = table.find((entry) => entry.marker === marker);
  return binding?.areaId ?? null;
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

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readProphetICalamitousEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.monsterCardId !== PROPHET_I_COMBAT_MONSTER_CARD_ID || actor.dead) {
    return false;
  }
  return Boolean(battle.prophetRoomD10AreaTable?.length);
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

  const table = battle.prophetRoomD10AreaTable;
  if (!table?.length) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Calamitous：缺少 prophetRoomD10AreaTable（Prophet Room 几何 hold）",
        },
      ],
    };
  }

  let cursor = battle.rngCursor;
  const rolls: number[] = [];
  const pewPlacements: { readonly areaId: string; readonly pewIndex: ProphetWoodenPewIndex }[] =
    [];

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

  return finishTurn(
    { ...state, battle: nextBattle },
    actorId,
    [
      {
        type: "dungeonUpdated",
        message: `Prophet I · Calamitous Prognostication：Wooden Pew 区域 d10（rolls=${rolls.join(",")}；markers=${markers.join("|")}；Rubble / 多行动 hold）`,
      },
    ],
  );
}

export function prophetRoomD10AreaTableFromMarkers(
  markerToAreaId: Readonly<Record<ProphetRoomD10Marker, string>>,
): readonly { readonly marker: string; readonly areaId: string }[] {
  return Object.entries(markerToAreaId).map(([marker, areaId]) => ({ marker, areaId }));
}

export function countWoodenPewsInArea(battle: BattleState, areaId: string): number {
  return (battle.woodenPews ?? []).filter((pew) => pew.areaId === areaId).length;
}
