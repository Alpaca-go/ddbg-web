import { newlyDefeatedIds, removeCasualties, endAfterCasualties } from "../encounter";
import type { ApplyResult, GameState } from "../command";
import type { DungeonState } from "../dungeon";
import type { BattleEntity } from "../battle";
import { rejectBattleCommand } from "../battle";
import { readActiveBossThreatScript } from "./threat-passive-runtime";
import { runBossHook } from "./hooks";
import { nextBattleRoll } from "../battle-roll";
import { readHeroPassiveDefence } from "../battle-skill-status";
import { addStatusStack, statusProjection } from "../status";
import { triggerBattlePassive } from "../battle-passive";
import { resolveBattlePressure } from "../pressure";

export function higherRuinsThreat(d: DungeonState | undefined, side: "dungeon" | "hamlet") {
  const script = d && readActiveBossThreatScript(d);
  if (!script) return undefined;
  const effect =
    side === "dungeon"
      ? runBossHook(script, "threatPassiveDungeon", { scriptId: script.id, side })
      : runBossHook(script, "threatPassiveHamlet", { scriptId: script.id, side });
  return effect.status === "ok" && effect.effect === "ruinsHigherThreat" ? effect : undefined;
}

export function higherRuinsScoutingStress(d: DungeonState): number {
  return higherRuinsThreat(d, "dungeon")?.kind === "scoutStress" ? 1 : 0;
}

/** 首次金币/饰品行前掷一次；停点与 JSON 续接保留结果，不重复掷骰。 */
export function curioRewardTheft(d: DungeonState, seed: number): DungeonState {
  const active = d.curio?.active;
  if (
    !active ||
    active.collectorTheftRoll !== undefined ||
    higherRuinsThreat(d, "dungeon")?.kind !== "curioTheft"
  )
    return d;
  const roll = nextBattleRoll(seed, d.cursor);
  return {
    ...d,
    cursor: d.cursor + 1,
    curio: { ...d.curio!, active: { ...active, collectorTheftRoll: roll } },
  };
}

/** R11：初始部署与后续召唤都属于 spawned；每个 Unholy 分别触发一次压力事件。 */
export function applyHigherRuinsBattleSpawn(before: GameState, result: ApplyResult): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  let b = result.state.battle;
  if (!b?.encounter) return result;
  const effect = higherRuinsThreat(result.state.dungeon, "dungeon");
  if (!effect) return result;
  const initial = !before.battle?.encounter;
  if (effect.kind === "battleMarkAll" && initial) {
    const script = result.state.dungeon!.activeBossThreatScriptId;
    const entities: BattleEntity[] = [];
    for (const e of b.entities) {
      if (e.side !== "hero" || e.dead) {
        entities.push(e);
        continue;
      }
      const defence = readHeroPassiveDefence(b, e);
      if (!defence) return rejectBattleCommand(before, "Fanatic 威胁缺完整英雄防御（R-048）");
      let stacks = e.statusStacks ?? [];
      for (const kind of script === "boss:ruins:fanatic:3"
        ? (["mark", "debuff"] as const)
        : (["mark"] as const)) {
        const added = addStatusStack(stacks, { kind, duration: effect.amount }, "target", defence);
        if (added.status === "refused") return rejectBattleCommand(before, added.reason);
        stacks = added.stacks;
      }
      entities.push({
        ...e,
        statusStacks: stacks,
        ...statusProjection(stacks, e.innateProtection),
      });
    }
    return { ...result, state: { ...result.state, battle: { ...b, entities } } };
  }
  if (effect.kind !== "unholySpawnStress") return result;
  const old = new Set(initial ? [] : before.battle?.entities.map((e) => e.id));
  const spawned = b.entities.filter(
    (e) =>
      e.side === "monster" &&
      !e.dead &&
      !old.has(e.id) &&
      b!.monsters
        ?.find((c) => c.id === e.monsterCardId)
        ?.type_position_tags?.some((tag) => tag.toLowerCase() === "unholy"),
  );
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
      message: `Fear of the Beyond：${monster.id} 生成，全体压力 +1`,
    });
  }
  if (!spawned.length) return result;
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
