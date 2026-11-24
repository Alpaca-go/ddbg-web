import type { ApplyResult, GameState } from "../../shared/core/command";
import { rejectBattleCommand } from "../../shared/battle/battle";
import {
  activeBossThreatMatchesDungeonLocation,
  readEffectiveBossThreatScriptId,
} from "../../core/bosses/threat-campaign";
import { statusProjection } from "../../shared/core/status";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { pounderContextForLevel } from "./pounder-runtime-context";
import { resolvePounderIRangedEntry } from "./pounder-i-threat";

export function readPounderThreatContext(state: GameState) {
  const d = state.dungeon;
  if (!d?.pounderDungeonThreats) return null;
  const active = readEffectiveBossThreatScriptId(d);
  if (active === POUNDER_I_SCRIPT_ID) return pounderContextForLevel(1);
  const level = d.campaignLevel;
  if (
    !d.wealdHigherBosses ||
    (level !== 2 && level !== 3) ||
    !d.contentPacks?.includes("weald") ||
    !["standard", "radiant"].includes(d.mode)
  )
    return null;
  const context = pounderContextForLevel(level);
  return active === context.scriptId && d.imminentThreatDescriptionCardId === context.description
    ? context
    : null;
}
export function pounderDungeonThreatActive(state: GameState): boolean {
  return readPounderThreatContext(state) !== null;
}

/** 公开命令提交前消费姿态变化；失败沿外层事务回滚，不读取棋盘区域。 */
export function applyPounderIRangedEntry(before: GameState, result: ApplyResult): ApplyResult {
  const battle = result.state.battle;
  const d = result.state.dungeon;
  if (!battle || !d || !activeBossThreatMatchesDungeonLocation(d)) return result;
  const context = readPounderThreatContext(result.state);
  if (!context || result.events.some((e) => e.type === "commandRefused")) return result;
  const events = [...result.events];
  const entities = [];
  for (const entity of battle.entities) {
    const previous = before.battle?.entities.find((e) => e.id === entity.id);
    if (
      entity.side !== "monster" ||
      entity.dead ||
      entity.stance !== "ranged" ||
      previous?.stance === "ranged"
    ) {
      entities.push(entity);
      continue;
    }
    // 历史沙盒投影没有 duration，不能用空堆覆盖旧状态。
    if (
      !entity.statusStacks &&
      (entity.bleed.length ||
        entity.blight.length ||
        entity.buffStacks ||
        entity.debuffStacks ||
        entity.markStacks ||
        entity.guard ||
        entity.riposte ||
        (entity.protection && !entity.innateProtection))
    )
      return rejectBattleCommand(before, "Pounder 威胁缺完整状态持续时间（R-048）");
    const applied = resolvePounderIRangedEntry(
      {
        ...entity,
        stance: entity.stance,
        previousStance: previous?.stance,
        statusStacks: entity.statusStacks ?? [],
      },
      context.threats.dungeon,
    );
    if (applied.status === "refused") return rejectBattleCommand(before, applied.reason);
    entities.push({
      ...entity,
      statusStacks: applied.stacks,
      ...statusProjection(applied.stacks, entity.innateProtection),
    });
    events.push({
      type: "dungeonUpdated" as const,
      message:
        context.level === 1
          ? `Bullseye Guillotine I：${entity.id} 进入 Ranged，增益2t＋反击1t（R-259）`
          : `${context.threats.dungeon.name}：${entity.id} 进入 Ranged，增益${context.threats.dungeon.buffDuration}t＋反击${context.threats.dungeon.riposteDuration}t（R-268）`,
    });
  }
  return { ...result, state: { ...result.state, battle: { ...battle, entities } }, events };
}
