import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { runBossHook } from "./hooks";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import {
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
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
    (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  );
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
