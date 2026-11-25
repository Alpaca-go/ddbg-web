import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "../core/command";
import type { HeroSkillResolution } from "../../core/heroes/hero-skill";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { WEALD_APPROVED_ROOM_TILES } from "../../weald/room-catalog";
import { wealdMechanicsActive } from "../../weald/mechanics";
import { wealdStygianEffect } from "../../weald/rooms/stygian-room-effects";

/** R-234／R-239：房间结算原语；正式攻击由 withToxicMushrooms 按命令版本启用。
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
  const stygian = wealdStygianEffect(state.dungeon, "toxicMushrooms");
  const duration = stygian?.kind === "toxicMushrooms" ? stygian.duration : 2;
  const effects = resolutions.flatMap((resolution) => {
    const target = battle.entities.find((entity) => entity.id === resolution.targetId);
    if (resolution.outcome !== "miss" || target?.side !== "hero" || !marked.has(target.areaId))
      return [];
    return battle.entities
      .filter((entity) => entity.side === "hero" && !entity.dead && entity.areaId === target.areaId)
      .map((entity) => ({
        ...fixedDamageResolution(entity, "area:toxicMushrooms"),
        targetStatusEffects: [{ kind: "blight" as const, amount: 1, duration }],
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
        message: `Toxic Mushrooms：未命中目标所在星区所有英雄腐蚀 1·${duration}t（R-234、R-239）`,
      },
    ],
  };
}

/** 命令版本只影响本次攻击；无标记的历史日志保留原结算。 */
export function withToxicMushrooms(
  original: GameState,
  applied: ApplyResult,
  enabled: true | undefined,
  actorId: string,
  resolutions: readonly HeroSkillResolution[],
): ApplyResult {
  if (!enabled) return applied;
  const result = resolveToxicMushrooms(applied.state, actorId, resolutions, applied.events);
  if (!result) return applied;
  const refusal = result.events.find((event) => event.type === "commandRefused");
  return refusal ? rejectBattleCommand(original, refusal.message) : result;
}
