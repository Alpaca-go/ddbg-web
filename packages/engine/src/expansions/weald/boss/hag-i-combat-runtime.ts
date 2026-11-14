import type { BattleEntity, BattleState } from "../../../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../../../command";
import type { MonsterCardView } from "../../../monster-skill";
import type { SkillTargetSide } from "../../../hero-skill";
import { runBossHook } from "../../../boss/hooks";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";
import {
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_INTO_THE_POT_SKILL_SLOT,
  HAG_I_SCRIPT_ID,
  hagICauldronBattleStartStance,
} from "./hag-i";
import { getBossScript } from "../../../boss/registry";
import type { BossScriptDefinition, BossSummonOk } from "../../../boss/types";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** W4：Hag 被击败时移出空锅；R-255 满锅释放的自动续接另行接线。 */
export function clearHagIEmptyCauldron(result: ApplyResult, ids: readonly string[]) {
  const battle = result.state.battle;
  if (
    !battle ||
    resolveEncounterBossScriptId(result.state) !== HAG_I_SCRIPT_ID ||
    !battle.entities.some(
      (e) =>
        e.side === "monster" &&
        e.monsterCardId === HAG_I_COMBAT_MONSTER_CARD_ID &&
        e.dead &&
        ids.includes(e.id),
    )
  )
    return { result, ids };
  const empty = emptyCauldronEntity(battle);
  if (!empty) return { result, ids };
  return {
    ids: [...ids, empty.id],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...battle,
          entities: battle.entities.map((e) => (e.id === empty.id ? { ...e, dead: true } : e)),
        },
      },
      events: [
        ...result.events,
        { type: "dungeonUpdated" as const, message: "Weald W4：Hag 被击败，移出空锅；不追加伤口" },
      ],
    },
  };
}

/** W4／R-254：Hag 两张，锅一张；已有两个实体各贡献一张，仅补 Hag 的第二张。 */
export function expandHagIInitiativeDeckSides(
  deck: readonly SkillTargetSide[],
  battle: BattleState,
  state: GameState,
): SkillTargetSide[] {
  if (resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID || !hagEntity(battle))
    return [...deck];
  return [...deck, "monster"];
}

/** finishTurn 先累加行动数，第二次结束才从本轮候选中移除 Hag。 */
export function hagShouldEnterActedIdsAfterTurn(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle || resolveEncounterBossScriptId(state) !== HAG_I_SCRIPT_ID) return true;
  if (hagEntity(battle)?.id !== actorId) return true;
  return (battle.hagActionsThisRound ?? 0) >= 2;
}

/** W4：空锅仍有先攻与回合，但在回合开始触发／状态结算后不执行动作。 */
export function hagIEmptyCauldronSkipsAction(state: GameState, actorId: string): boolean {
  return (
    !!state.battle &&
    resolveEncounterBossScriptId(state) === HAG_I_SCRIPT_ID &&
    emptyCauldronEntity(state.battle!)?.id === actorId
  );
}

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
    result.effect === "forceIntoThePotWhileCauldronEmptyEachTurn" &&
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

/** R-255：每次 Hag 回合且空锅在场，均先用 Into the Pot；不是每轮仅首次。 */
export function hagIntoThePotShouldForceSkill(state: GameState, actorId: string): boolean {
  const battle = state.battle;
  if (!battle?.encounter || battle.monsterAction) return false;
  const turn = battle.encounter.turn;
  if (turn.type !== "monster" || turn.actorId !== actorId) return false;
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
  // W4 / R-048：使用已核实的怪物部署标记，英雄当前位置不能充当部署区域。
  return battle.monsterStanceAreas?.[stance] ?? null;
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
