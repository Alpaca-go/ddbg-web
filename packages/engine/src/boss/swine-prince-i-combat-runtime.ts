import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  swinePrinceIWilburBattleStartStance,
} from "./swine-prince-i";
import { getBossScript } from "./registry";
import type { BossScriptDefinition, BossSummonOk } from "./types";

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
