import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  SIREN_I_COMBAT_MONSTER_CARD_ID,
  SIREN_I_HIGH_TIDE_SKILL_SLOT,
  SIREN_I_PELAGIC_MONSTER_CARD_ID,
  SIREN_I_SCRIPT_ID,
  sirenIPelagicHighTideStance,
} from "./siren-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk } from "./types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

export function readSirenIHighTidePelagicPlan(
  script: BossScriptDefinition,
  skillSlot: number,
): BossSummonOk["value"] | null {
  if (script.id !== SIREN_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot,
    purpose: "highTidePelagic",
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function readSirenIHighTideSkillSlot(script: BossScriptDefinition): number | null {
  if (script.id !== SIREN_I_SCRIPT_ID) return null;
  return SIREN_I_HIGH_TIDE_SKILL_SLOT;
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function sirenEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === SIREN_I_COMBAT_MONSTER_CARD_ID,
  );
}

function readPelagicCard(battle: BattleState): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === SIREN_I_PELAGIC_MONSTER_CARD_ID);
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

function areaOccupancy(battle: BattleState, areaId: string): number {
  return battle.entities
    .filter((entity) => !entity.dead && entity.areaId === areaId)
    .reduce((sum, entity) => sum + (entity.side === "hero" ? 1 : entity.stanceSlots!), 0);
}

function areaHasSpaceForSummon(
  battle: BattleState,
  areaId: string,
  width: 1 | 2,
): boolean {
  const area = battle.areas.find((entry) => entry.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return false;
  return areaOccupancy(battle, areaId) + width <= area.capacity!;
}

/** Siren 使用 High Tide slot 且 plan 为 targetArea 时，在目标区域写入 Pelagic。 */
export function sirenIHighTideShouldSummonPelagic(
  state: GameState,
  actorId: string,
  skillSlot: number,
): boolean {
  const battle = state.battle;
  if (!battle?.encounter) return false;
  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || script.id !== SIREN_I_SCRIPT_ID) return false;
  if (skillSlot !== SIREN_I_HIGH_TIDE_SKILL_SLOT) return false;
  const actor = battle.entities.find((entry) => entry.id === actorId);
  if (!actor || actor.dead || actor.monsterCardId !== SIREN_I_COMBAT_MONSTER_CARD_ID) return false;
  const plan = readSirenIHighTidePelagicPlan(script, skillSlot);
  return plan?.miniaturePlacement === "targetArea";
}

export function applySirenIHighTidePelagicSummon(
  state: GameState,
  skillSlot: number,
  targetAreaId: string,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== SIREN_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script || !sirenEntity(battle)) return { state, events: [] };
  if (skillSlot !== SIREN_I_HIGH_TIDE_SKILL_SLOT) return { state, events: [] };

  const plan = readSirenIHighTidePelagicPlan(script, skillSlot);
  if (!plan || plan.summonMonsterCardId !== SIREN_I_PELAGIC_MONSTER_CARD_ID) {
    return { state, events: [] };
  }
  if (plan.miniaturePlacement !== "targetArea") {
    return {
      state,
      events: [{ type: "commandRefused", message: "Siren Pelagic 落点语义未核实（R-048）" }],
    };
  }

  const card = readPelagicCard(battle);
  if (!card) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: `Siren Pelagic 缺少已核实 ${SIREN_I_PELAGIC_MONSTER_CARD_ID}（R-048）`,
        },
      ],
    };
  }

  if (!battle.areas.some((area) => area.id === targetAreaId)) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Siren Pelagic 目标区域无效（R-048）" }],
    };
  }

  const fixedStance = plan.fixedStance ?? sirenIPelagicHighTideStance();
  if (fixedStance !== sirenIPelagicHighTideStance()) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Siren Pelagic 召唤姿态未核实（R-048）" }],
    };
  }

  const width = 1 as const;
  const position = STANCES.indexOf(fixedStance);
  if (!stanceTrackFree(battle, position, width)) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Siren Pelagic 姿态轨无空间（R-048）" }],
    };
  }
  if (!areaHasSpaceForSummon(battle, targetAreaId, width)) {
    return {
      state,
      events: [{ type: "commandRefused", message: "Siren Pelagic 目标区域容量不足（R-048）" }],
    };
  }

  const pelagicId = `boss:siren:pelagic:${battle.entities.length}`;
  const dodge =
    (card as MonsterCardView & { readonly dodge?: number }).dodge ??
    (card as { readonly dodge?: number }).dodge ??
    0;
  const entity: BattleEntity = {
    id: pelagicId,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId: targetAreaId,
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
        message: `Siren I · High Tide：Pelagic 写入 ${pelagicId}（${targetAreaId}）`,
      },
    ],
  };
}

/** 怪物技能结算后链接 High Tide Pelagic 召唤。 */
export function chainSirenIHighTidePelagicAfterMonsterSkill(
  result: ApplyResult,
  actorId: string,
  skillSlot: number,
  targetAreaId: string,
): ApplyResult {
  if (result.events.some((event) => event.type === "commandRefused")) return result;
  if (!sirenIHighTideShouldSummonPelagic(result.state, actorId, skillSlot)) return result;
  const summoned = applySirenIHighTidePelagicSummon(result.state, skillSlot, targetAreaId);
  if (summoned.events.some((event) => event.type === "commandRefused")) return summoned;
  return {
    state: summoned.state,
    events: [...result.events, ...summoned.events],
  };
}
