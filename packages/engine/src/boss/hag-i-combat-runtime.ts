import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_FIRST_ACTION_INDEX,
  HAG_I_INTO_THE_POT_SKILL_SLOT,
  HAG_I_SCRIPT_ID,
  hagICauldronBattleStartStance,
} from "./hag-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk } from "./types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

export function readHagICauldronBattleStartPlan(
  script: BossScriptDefinition,
): BossSummonOk["value"] | null {
  if (script.id !== HAG_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "battleStartCauldron",
  });
  if (result.status !== "ok") return null;
  return result.value;
}

function livingMonsters(battle: BattleState) {
  return battle.entities.filter((entity) => entity.side === "monster" && !entity.dead);
}

function hagEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === HAG_I_COMBAT_MONSTER_CARD_ID,
  );
}

function cauldronEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) =>
      entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID ||
      entity.monsterCardId === HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  );
}

function emptyCauldronEntity(battle: BattleState): BattleEntity | undefined {
  return livingMonsters(battle).find(
    (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  );
}

export function readHagICauldronFullMorphPlan(
  script: BossScriptDefinition,
): BossSummonOk["value"] | null {
  if (script.id !== HAG_I_SCRIPT_ID) return null;
  const result = runBossHook(script, "summon", {
    scriptId: script.id,
    skillSlot: 0,
    purpose: "cauldronFullMorph",
  });
  if (result.status !== "ok") return null;
  return result.value;
}

export function readHagIIntoThePotEnabled(script: BossScriptDefinition): boolean {
  if (script.id !== HAG_I_SCRIPT_ID) return false;
  const result = runBossHook(script, "intoThePot", { scriptId: script.id });
  return (
    result.status === "ok" &&
    result.effect === "forceIntoThePotWhileCauldronEmptyOnFirstActionEachRound" &&
    result.skillSlot === HAG_I_INTO_THE_POT_SKILL_SLOT
  );
}

export function readHagIIntoThePotSkillSlot(script: BossScriptDefinition): number | null {
  if (!readHagIIntoThePotEnabled(script)) return null;
  const result = runBossHook(script, "intoThePot", { scriptId: script.id });
  if (result.status !== "ok") return null;
  return result.skillSlot;
}

export function hagActionIndexBeforeTurn(battle: BattleState): number {
  return battle.hagActionsThisRound ?? 0;
}

export function bumpHagIActionRoundCount(state: GameState, actorId: string): GameState {
  const battle = state.battle;
  if (!battle?.encounter) return state;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== HAG_I_COMBAT_MONSTER_CARD_ID
  ) {
    return state;
  }
  if (resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID) return state;
  const count = battle.hagActionsThisRound ?? 0;
  return { ...state, battle: { ...battle, hagActionsThisRound: count + 1 } };
}

/** Cauldron Empty 在场且为本轮 Hag 首次行动 → 强制 Into the Pot! slot。 */
export function hagIntoThePotShouldForceSkill(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;
  if (hagActionIndexBeforeTurn(battle) !== HAG_I_FIRST_ACTION_INDEX) return false;
  if (!emptyCauldronEntity(battle)) return false;

  const scriptId = resolveEncounterBossScriptId(state);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!script || !readHagIIntoThePotEnabled(script)) return false;

  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (!actor || actor.monsterCardId !== HAG_I_COMBAT_MONSTER_CARD_ID || actor.dead) {
    return false;
  }
  return true;
}

function readMonsterCard(battle: BattleState, cardId: string): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === cardId);
  if (!card || card.verification.unverified) return null;
  if (!Number.isInteger(card.life) || card.life < 1) return null;
  return card;
}

/** Into the Pot! 结算后：Empty Cauldron 实体 morph 为 Full（同格、同 area；英雄入锅语义 hold）。 */
export function applyHagICauldronEmptyToFullMorph(
  state: GameState,
  hagActorId: string,
  skillSlot: number,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== HAG_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script || !readHagIIntoThePotEnabled(script)) return { state, events: [] };
  if (skillSlot !== HAG_I_INTO_THE_POT_SKILL_SLOT) return { state, events: [] };

  const hag = battle.entities.find((entity) => entity.id === hagActorId);
  if (!hag || hag.monsterCardId !== HAG_I_COMBAT_MONSTER_CARD_ID || hag.dead) {
    return { state, events: [] };
  }

  const empty = emptyCauldronEntity(battle);
  if (!empty) return { state, events: [] };

  const plan = readHagICauldronFullMorphPlan(script);
  if (!plan || plan.summonMonsterCardId !== HAG_I_CAULDRON_FULL_MONSTER_CARD_ID) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Hag Cauldron Full morph 计划未核实（R-048）",
        },
      ],
    };
  }

  const fullCard = readMonsterCard(battle, HAG_I_CAULDRON_FULL_MONSTER_CARD_ID);
  if (!fullCard) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: `Hag Cauldron Full 缺少已核实 ${HAG_I_CAULDRON_FULL_MONSTER_CARD_ID}（R-048）`,
        },
      ],
    };
  }

  const entities = battle.entities.map((entity) => {
    if (entity.id !== empty.id) return entity;
    return {
      ...entity,
      monsterCardId: fullCard.id,
      life: fullCard.life,
      wounds: 0,
      ...(fullCard.innateProtection === undefined
        ? {}
        : { innateProtection: fullCard.innateProtection, protection: fullCard.innateProtection }),
    };
  });

  return {
    state: {
      ...state,
      battle: {
        ...battle,
        entities,
        monsters: battle.monsters?.some((entry) => entry.id === fullCard.id)
          ? battle.monsters
          : [...(battle.monsters ?? []), fullCard],
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Hag I · Cauldron Empty→Full：${empty.id} → ${fullCard.id}（Into the Pot! slot ${skillSlot}；英雄入锅 / 42418 hold）`,
      },
    ],
  };
}

/** Hag Into the Pot! 怪物技能结算后链接 Empty→Full morph。 */
export function chainHagICauldronFullAfterIntoThePot(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
): ApplyResult {
  if (result.events.some((event) => event.type === "commandRefused")) return result;
  const morphed = applyHagICauldronEmptyToFullMorph(
    result.state,
    resolved.actorId,
    resolved.skillSlot,
  );
  if (morphed.events.some((event) => event.type === "commandRefused")) return morphed;
  if (morphed.events.length === 0) return result;
  return {
    state: morphed.state,
    events: [...result.events, ...morphed.events],
  };
}

function readCauldronCard(battle: BattleState): MonsterCardView | null {
  const card = battle.monsters?.find((entry) => entry.id === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID);
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

/** Hag I · Empty Cauldron：Boss 战 `startBattle` 前写入 Cauldron 实体（姿态轨 + 对应区域）。 */
export function applyHagICauldronBattleStart(state: GameState): ApplyResult {
  const battle = state.battle;
  const d = state.dungeon;
  if (!battle || !d) return { state, events: [] };
  const scriptId = resolveEncounterBossScriptId(state);
  if (scriptId !== HAG_I_SCRIPT_ID) return { state, events: [] };
  const script = getBossScript(scriptId);
  if (!script) return { state, events: [] };
  if (!hagEntity(battle)) return { state, events: [] };
  if (cauldronEntity(battle)) return { state, events: [] };

  const plan = readHagICauldronBattleStartPlan(script);
  if (!plan || plan.summonMonsterCardId !== HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID) {
    return { state, events: [] };
  }
  const fixedStance = plan.fixedStance ?? hagICauldronBattleStartStance();
  if (fixedStance !== hagICauldronBattleStartStance()) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Hag Cauldron 开战姿态未核实（R-048）",
        },
      ],
    };
  }

  const card = readCauldronCard(battle);
  if (!card) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: `Hag Cauldron 缺少已核实 ${HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID}，不能猜开战布置（R-048）`,
        },
      ],
    };
  }

  const width = 2 as const;
  const position = STANCES.indexOf(fixedStance);
  if (!stanceTrackFree(battle, position, width)) {
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Hag Cauldron 姿态轨无空间，不能猜开战布置（R-048）",
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
          message: "Hag Cauldron 缺对应姿态区域，不能猜落点（R-048）",
        },
      ],
    };
  }

  const cauldronId = "boss:hag:cauldron-empty";
  const dodge =
    (card as MonsterCardView & { readonly dodge?: number }).dodge ??
    (card as { readonly dodge?: number }).dodge ??
    0;
  const entity: BattleEntity = {
    id: cauldronId,
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
        message: `Hag I · Cauldron Empty：开局写入 ${cauldronId}（${areaId}；${script.displayName}）`,
      },
    ],
  };
}
