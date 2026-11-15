import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import type { HeroSkillResolution } from "./hero-skill";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { WEALD_APPROVED_ROOM_TILES } from "./expansions/weald/room-catalog";
import { wealdMechanicsActive } from "./expansions/weald/weald-mechanics";

/** R-234／R-239：独立结算原语；正式接线须先建立新日志版本。
 * 输入须为攻击位移前的状态；每次未命中分别影响目标当时所在星区。
 */
export function resolveToxicMushrooms(
  state: GameState,
  actorId: string,
  resolutions: readonly HeroSkillResolution[],
  events: readonly GameEvent[] = [],
): ApplyResult | null {
  if (!wealdMechanicsActive(state)) return null;
  const battle = state.battle!;
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (actor?.side !== "monster") return null;
  const roomId = state.dungeon?.roomCards?.active?.cardId;
  const tile = WEALD_APPROVED_ROOM_TILES.find(
    (entry) => entry.roomId === roomId && entry.number === 1,
  );
  if (!tile) return null;
  const marked = new Set(
    tile.specialRegions
      .filter((region) => region.effect === "toxicMushrooms" && region.status === "confirmed")
      .map((region) => region.areaId),
  );
  const effects = resolutions.flatMap((resolution) => {
    const target = battle.entities.find((entity) => entity.id === resolution.targetId);
    if (resolution.outcome !== "miss" || target?.side !== "hero" || !marked.has(target.areaId))
      return [];
    return battle.entities
      .filter((entity) => entity.side === "hero" && !entity.dead && entity.areaId === target.areaId)
      .map((entity) => ({
        ...fixedDamageResolution(entity, "area:toxicMushrooms"),
        targetStatusEffects: [{ kind: "blight" as const, amount: 1, duration: 2 }],
      }));
  });
  if (!effects.length) return null;
  const statuses = applyBattleSkillStatuses(
    battle,
    battle.entities,
    "",
    effects,
    state.seed,
    battle.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  return {
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
        trigger: "toxicMushrooms",
        message: "Toxic Mushrooms：未命中目标所在星区所有英雄腐蚀 1·2t（R-234、R-239）",
      },
    ],
  };
}
