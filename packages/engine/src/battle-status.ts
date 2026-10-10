import type { BattleEntity } from "./battle";
import type { GameEvent } from "./command";
import { resolveSeededHeroHealth } from "./hero-health";
import { statusProjection, tickStatusStacks } from "./status";

export function resolveTurnStartStatus(
  entity: BattleEntity,
  seed: number,
  rngCursor: number,
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly entity: BattleEntity;
      readonly stunned: boolean;
      readonly rngCursor: number;
      readonly events: readonly GameEvent[];
    } {
  if (entity.statusStacks === undefined)
    return { status: "resolved", entity, stunned: false, rngCursor, events: [] };
  const tick = tickStatusStacks(entity.statusStacks);
  if (tick.status === "refused") return tick;
  let updated: BattleEntity = {
    ...entity,
    statusStacks: tick.stacks,
    ...statusProjection(tick.stacks, entity.innateProtection),
  };
  const events: GameEvent[] = [
    {
      type: "statusTurnStarted",
      message: "每堆移除一枚状态代币，Bleed / Blight 同时结算",
      entityId: entity.id,
      woundAmounts: tick.woundAmounts,
      stunned: tick.stunned,
    },
  ];
  if (tick.woundAmounts.some((amount) => amount > 0)) {
    if (entity.life === undefined)
      return { status: "refused", reason: "状态伤口接收者缺少已核实 Life（R-048）" };
    if (entity.side === "hero") {
      const effect = { type: "wounds" as const, amounts: tick.woundAmounts };
      const health = resolveSeededHeroHealth(
        { life: entity.life, wounds: entity.wounds, dead: entity.dead },
        effect,
        seed,
        rngCursor,
      );
      if (health.status !== "resolved")
        return {
          status: "refused",
          reason: health.status === "refused" ? health.reason : "死门骰未完成",
        };
      rngCursor = health.rngCursor;
      updated = { ...updated, wounds: health.state.wounds, dead: health.state.dead };
      events.push({
        type: "heroHealthResolved",
        message: "回合开始同时伤口只判定一次死门",
        entityId: entity.id,
        effect,
        resolution: health,
      });
    } else {
      const wounds = entity.wounds + tick.woundAmounts.reduce((sum, amount) => sum + amount, 0);
      if (!Number.isSafeInteger(wounds))
        return { status: "refused", reason: "怪物合计伤口超出安全整数范围" };
      updated = { ...updated, wounds, dead: wounds >= entity.life };
    }
  }
  return { status: "resolved", entity: updated, stunned: tick.stunned, rngCursor, events };
}
