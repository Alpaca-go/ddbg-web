import { newlyDefeatedIds, removeCasualties, endAfterCasualties } from "./encounter";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { triggerBattlePassive } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";

/** Creeping Darkness III（quest_cards.json quest:p014 SPECIAL）。 */
export const CREEPING_DARKNESS_III_QUEST_ID = "quest:p014" as const;

export function creepingDarknessIIIQuestActive(d: DungeonState | undefined): boolean {
  return d?.questDistribution?.questId === CREEPING_DARKNESS_III_QUEST_ID;
}

function monsterHasUnholyTag(
  battle: NonNullable<GameState["battle"]>,
  monsterCardId: string,
): boolean {
  return (
    battle.monsters
      ?.find((c) => c.id === monsterCardId)
      ?.type_position_tags?.some((tag) => tag.toLowerCase() === "unholy") ?? false
  );
}

/** quest:p014：初始部署与后续召唤都属于 spawned；每个 Unholy 分别触发一次全队 +1 压力。 */
export function applyCreepingDarknessUnholySpawnStress(
  before: GameState,
  result: ApplyResult,
): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  if (!creepingDarknessIIIQuestActive(result.state.dungeon)) return result;
  let b = result.state.battle;
  if (!b?.encounter) return result;
  const initial = !before.battle?.encounter;
  const old = new Set(initial ? [] : before.battle?.entities.map((e) => e.id));
  const spawned = b.entities.filter(
    (e) =>
      e.side === "monster" &&
      !e.dead &&
      !old.has(e.id) &&
      e.monsterCardId !== undefined &&
      monsterHasUnholyTag(b!, e.monsterCardId),
  );
  if (!spawned.length) return result;
  const events = [...result.events];
  for (const monster of spawned) {
    const applied = triggerBattlePassive(
      b,
      result.state.seed,
      b.entities.filter((e) => e.side === "hero" && !e.dead).map((e) => e.id),
      { type: "stress", amount: 1 },
    );
    if (applied.status === "refused") return rejectBattleCommand(before, applied.reason);
    b = applied.battle;
    events.push(...applied.events, {
      type: "dungeonUpdated",
      message: `Creeping Darkness III：${monster.id}（Unholy）生成，全体压力 +1（quest:p014）`,
    });
  }
  const pressure = resolveBattlePressure({
    ...result,
    state: { ...result.state, battle: b },
    events,
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(
    pressure,
    newlyDefeatedIds(result.state.battle!, pressure.state.battle!.entities),
  );
  return endAfterCasualties(removed) ?? removed;
}
