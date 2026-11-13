import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { isLivingCombatMonster } from "./expansions/weald/necrotic-fungus";
import {
  DISINFECTION_QUEST_ID,
  INFECTION_OAK_ROOM_CARD_ID,
  isDisinfectionQuest,
} from "./expansions/weald/disinfection-quest";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { endAfterCasualties, newlyDefeatedIds, removeCasualties } from "./encounter";

function disinfectionBattleContext(state: GameState): string | null {
  const d = state.dungeon;
  const b = state.battle;
  if (!d || !b || !isDisinfectionQuest(d)) return "非 Disinfection 任务";
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "objective") return "消毒仅在 Weald 目标房生效（R-245）";
  if (d.roomCards?.active?.cardId !== INFECTION_OAK_ROOM_CARD_ID)
    return "当前板块不是 Infected Oak（R-243、R-245）";
  const livingMonsters = b.entities.filter(
    (e) => e.side === "monster" && !e.dead && isLivingCombatMonster(e),
  );
  if (!livingMonsters.length) return "无存活怪物，战斗交互已结束（R-245）";
  return null;
}

/** R-245：1 行动 + 1 枚公共池 Potion，须站在 Poisonous Roots 星区且战斗未结束。 */
export function disinfectInfectedOak(state: GameState, actorId: string): ApplyResult {
  const b = state.battle;
  const turn = b?.encounter?.turn;
  const hero = b?.entities.find((e) => e.id === actorId);
  const context = disinfectionBattleContext(state);
  if (
    context ||
    !b ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 1 ||
    turn.mustMove ||
    !hero ||
    hero.dead ||
    hero.side !== "hero" ||
    b.infectedOakDisinfected ||
    b.pending ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    !b.areas.find((a) => a.id === hero.areaId)?.poisonousRoots
  )
    return rejectBattleCommand(
      state,
      context ?? "消毒需要当前英雄在 Poisonous Roots 星区、至少 1 行动且仍有存活敌人（R-245）",
    );
  const pool = b.provisions ?? [];
  const potionIndex = pool.findIndex((item) => item.face === "potion");
  if (potionIndex < 0) return rejectBattleCommand(state, "消毒需要消耗 1 枚 Potion（R-245）");
  const provisions = pool.filter((_, index) => index !== potionIndex);
  const events: GameEvent[] = [
    {
      type: "roomInteractionResolved",
      actorId,
      message: "Infected Oak：花费 1 行动与 1 枚 Potion 消毒橡树（R-245）",
    },
  ];
  return {
    state: {
      ...state,
      battle: {
        ...b,
        infectedOakDisinfected: true,
        provisions,
        encounter: { ...b.encounter!, turn: { ...turn, actions: turn.actions - 1 } },
      },
    },
    events,
  };
}

/** R-245：星区结束回合上腐蚀 2·2t。 */
export function endTurnPoisonousRoots(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const battle = state.battle!;
  const actor = battle.entities.find((e) => e.id === actorId)!;
  if (actor.dead || actor.side !== "hero") return null;
  const area = battle.areas.find((a) => a.id === actor.areaId);
  if (!area?.poisonousRoots) return null;
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    "",
    [
      {
        ...fixedDamageResolution(actor, "area:poisonousRoots"),
        targetStatusEffects: [{ kind: "blight", amount: 2, duration: 2 }],
      },
    ],
    state.seed,
    battle.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  const next: ApplyResult = {
    state: {
      ...state,
      battle: { ...battle, entities: statuses.entities, rngCursor: statuses.rngCursor },
    },
    events: [
      ...events,
      ...statuses.events,
      {
        type: "passiveTriggered",
        entityId: actorId,
        trigger: "poisonousRoots",
        message: "Poisonous Roots：英雄结束回合受到腐蚀 2·2t（R-245、R-234）",
      },
    ],
  };
  if (next.events.some((e) => e.type === "commandRefused")) return next;
  const removed = removeCasualties(next, newlyDefeatedIds(battle, next.state.battle!.entities));
  return endAfterCasualties(removed) ?? removed;
}

export function disinfectionObjectiveBattleActive(state: GameState): boolean {
  return disinfectionBattleContext(state) === null;
}

export function isDisinfectionQuestId(
  questId: string | undefined,
): questId is typeof DISINFECTION_QUEST_ID {
  return questId === DISINFECTION_QUEST_ID;
}
