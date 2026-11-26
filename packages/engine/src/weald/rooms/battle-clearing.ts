import type { ApplyResult, GameEvent, GameState } from "../../shared/core/command";
import { rejectBattleCommand } from "../../shared/battle/battle";
import { createLootState } from "../../shared/trinkets/loot";
import { createRng } from "../../shared/core/rng";
import { isLivingCombatMonster } from "../quests/necrotic-fungus";
import { wealdMechanicsActive } from "../mechanics";
import { wealdOrdinaryRoomEffectActive } from "./stygian-room-effects";

/** R-234／R-238：B 区英雄压力恢复，复用共用结束回合原语。 */
export function enableClearingHeroes(state: GameState): GameState {
  if (
    !wealdMechanicsActive(state) ||
    !wealdOrdinaryRoomEffectActive(state, "room:weald:09", "clearing")
  )
    return state;
  return {
    ...state,
    battle: {
      ...state.battle!,
      areas: state.battle!.areas.map((area) =>
        area.id === "B" ? { ...area, endTurnStress: -1, endTurnStressName: "Clearing" } : area,
      ),
    },
  };
}

export function enableClearingMonsters(state: GameState): GameState {
  if (
    !wealdMechanicsActive(state) ||
    !wealdOrdinaryRoomEffectActive(state, "room:weald:09", "clearing")
  )
    return state;
  return { ...state, battle: { ...state.battle!, wealdClearingMonsters: true } };
}

/** R-234／R-238／R-260：随机移除的未拾箱回本次地牢可用池，不算拾取。 */
export function endTurnClearingMonster(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  if (
    !state.battle?.wealdClearingMonsters ||
    !wealdMechanicsActive(state) ||
    !wealdOrdinaryRoomEffectActive(state, "room:weald:09", "clearing")
  )
    return null;
  const battle = state.battle;
  const actor = battle.entities.find((e) => e.id === actorId);
  if (!actor || !isLivingCombatMonster(actor) || actor.areaId !== "B") return null;
  const loot = battle.loot;
  if (!loot) return rejectBattleCommand(state, "Clearing 缺少已部署宝箱池（R-048）");
  const canonical = createLootState().available;
  const tokens = [...loot.available, ...loot.placed];
  const ids = [...tokens.map((t) => t.id), ...loot.claimedIds];
  if (
    ids.length !== 10 ||
    new Set(ids).size !== 10 ||
    ids.some((id) => !canonical.some((t) => t.id === id)) ||
    tokens.some((t) => !canonical.some((c) => c.id === t.id && c.kind === t.kind))
  )
    return rejectBattleCommand(state, "Clearing 宝箱有限池不守恒（R-047、R-260）");
  if (!loot.placed.length) return null;
  const rng = createRng(state.seed);
  for (let i = 0; i < battle.rngCursor; i++) rng.next();
  const chosen = loot.placed[Math.floor(rng.next() * loot.placed.length)]!;
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        rngCursor: battle.rngCursor + 1,
        loot: {
          ...loot,
          placed: loot.placed.filter((t) => t.id !== chosen.id),
          available: [...loot.available, { id: chosen.id, kind: chosen.kind }],
        },
      },
    },
    events: [
      ...events,
      {
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "clearing",
        message: `Clearing：随机移除宝箱 ${chosen.id}，归还本次地牢可用池（R-260）`,
      },
    ],
  };
}
