import type { ApplyResult, GameState } from "../../../command";
import { rejectBattleCommand } from "../../../battle";
import { readEffectiveBossThreatScriptId } from "../../../boss/threat-campaign";
import { statusProjection } from "../../../status";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { resolvePounderIRangedEntry } from "./pounder-i-threat";

export function pounderDungeonThreatActive(state: GameState): boolean {
  const d = state.dungeon;
  return !!d?.pounderDungeonThreats && readEffectiveBossThreatScriptId(d) === POUNDER_I_SCRIPT_ID;
}

/** 公开命令提交前消费姿态变化；失败沿外层事务回滚，不读取棋盘区域。 */
export function applyPounderIRangedEntry(before: GameState, result: ApplyResult): ApplyResult {
  const battle = result.state.battle;
  if (
    !pounderDungeonThreatActive(result.state) ||
    !battle ||
    result.events.some((e) => e.type === "commandRefused")
  )
    return result;
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
    const applied = resolvePounderIRangedEntry({
      ...entity,
      stance: entity.stance,
      previousStance: previous?.stance,
      statusStacks: entity.statusStacks ?? [],
    });
    if (applied.status === "refused") return rejectBattleCommand(before, applied.reason);
    entities.push({
      ...entity,
      statusStacks: applied.stacks,
      ...statusProjection(applied.stacks, entity.innateProtection),
    });
    events.push({
      type: "dungeonUpdated" as const,
      message: `Bullseye Guillotine I：${entity.id} 进入 Ranged，增益2t＋反击1t（R-259）`,
    });
  }
  return { ...result, state: { ...result.state, battle: { ...battle, entities } }, events };
}
