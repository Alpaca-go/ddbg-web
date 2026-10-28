import { healingForbidden } from "./battle-healing";
import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { resolveHeroHealth } from "./hero-health";
import { statusProjection, statusStackProblem } from "./status";
import { passiveHeal, passiveStress } from "./passive";
import { triggerBattlePassive } from "./battle-passive";
import { resolveBattlePressure } from "./pressure";
import { removeCasualties, endAfterCasualties, newlyDefeatedIds, finishTurn } from "./encounter";
import { applyBossThreatStressOnProvisionUse } from "./boss/threat-passive-runtime";

export type ProvisionEffect = "heal" | "clearBleed" | "clearBlight" | "reduceStress" | "raiseLight";
export type UseProvisionCommand = {
  readonly type: "useProvision";
  readonly provisionId: string;
  readonly targetId: string;
  readonly effect: ProvisionEffect;
};
export const PROVISION_EFFECTS = {
  food: ["heal"],
  bandage: ["heal", "clearBleed"],
  potion: ["reduceStress", "clearBlight"],
  torch: ["raiseLight"],
  tool: [],
} as const;
/** R12 / R-027：仅在完整效果间的许可窗口免费消耗，不能插入技能 / 位移结算。 */
export function useProvision(state: GameState, command: UseProvisionCommand): ApplyResult {
  const battle = state.battle;
  const turn = battle?.encounter?.turn;
  const window = battle?.pending?.type === "turnStartProvision";
  if (
    !battle ||
    !turn ||
    turn.type === "finished" ||
    turn.type === "halted" ||
    (battle.pending && !window) ||
    battle.shuffleIntents.length ||
    battle.shuffleContinuation ||
    (turn.type === "monster" && !window && !battle.monsterAction?.positioned)
  )
    return rejectBattleCommand(state, "补给只能在 R-027 许可窗口使用，不能插入未完成结算");
  const pool = battle.provisions;
  if (!pool || pool.length > 16 || new Set(pool.map((item) => item.id)).size !== pool.length)
    return rejectBattleCommand(state, "补给池缺失 / 无效");
  const provision = pool.find((item) => item.id === command.provisionId);
  const target = battle.entities.find((entity) => entity.id === command.targetId);
  if (
    !provision ||
    !target ||
    target.side !== "hero" ||
    target.dead ||
    !(PROVISION_EFFECTS[provision.face] as readonly string[] | undefined)?.includes(command.effect)
  )
    return rejectBattleCommand(state, "补给、存活英雄或战斗效果无效；工具只在探索中使用（R12）");
  let updated = target;
  let light = battle.light;
  if (command.effect === "heal") {
    if (healingForbidden(battle, target.id))
      return rejectBattleCommand(state, "Unholy Aura：此区域英雄不能被治疗（R-067）");
    if (target.life === undefined)
      return rejectBattleCommand(state, "补给治疗缺已核实 Life（R-048）");
    const health = resolveHeroHealth(
      { life: target.life, wounds: target.wounds, dead: target.dead },
      { type: "heal", amount: passiveHeal(target, 1) },
    );
    if (health.status !== "resolved")
      return rejectBattleCommand(
        state,
        health.status === "refused" ? health.reason : "治疗不应请求死门骰",
      );
    updated = { ...target, wounds: health.state.wounds };
  } else if (command.effect === "reduceStress") {
    if (!Number.isSafeInteger(target.stress) || target.stress! < 0 || target.stress! > 10)
      return rejectBattleCommand(state, "补给减压缺已知压力（R-048）");
    updated = {
      ...target,
      stress: Math.max(0, target.stress! + passiveStress(target, -1, battle.light).amount),
    };
  } else if (command.effect === "raiseLight") {
    if (!Number.isSafeInteger(light) || light < 0 || light > 5)
      return rejectBattleCommand(state, "补给光照无效");
    light = Math.min(5, light + 1);
  } else {
    const kind = command.effect === "clearBleed" ? "bleed" : "blight";
    if (target.statusStacks !== undefined) {
      const problem = statusStackProblem(target.statusStacks);
      if (problem) return rejectBattleCommand(state, problem);
      const stacks = target.statusStacks.filter((stack) => stack.kind !== kind);
      updated = {
        ...target,
        statusStacks: stacks,
        ...statusProjection(stacks, target.innateProtection),
      };
    }
    updated = { ...updated, [kind]: [] };
  }
  let result: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...battle,
        light,
        provisions: pool.filter((item) => item.id !== provision.id),
        entities: battle.entities.map((entity) => (entity.id === updated.id ? updated : entity)),
      },
    },
    events: [
      {
        type: "provisionConsumed",
        entityId: target.id,
        provisionId: provision.id,
        face: provision.face,
        effect: command.effect,
        message: "免费使用补给，效果已结算，移除一颗骰子",
      },
    ],
    ...(window ? { pendingChoice: battle.pending!.choice } : {}),
  };
  const triggers = [
    ...(provision.face === "food" ? [{ ids: [target.id], trigger: "foodConsumed" as const }] : []),
    ...(light > battle.light
      ? [
          {
            ids: battle.entities.filter((e) => e.side === "hero" && !e.dead).map((e) => e.id),
            trigger: "lightRaised" as const,
          },
        ]
      : []),
  ];
  for (const { ids, trigger } of triggers) {
    const applied = triggerBattlePassive(result.state.battle!, state.seed, ids, trigger);
    if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
    result = {
      ...result,
      state: { ...result.state, battle: applied.battle },
      events: [...result.events, ...applied.events],
    };
  }
  const pressure = resolveBattlePressure(result);
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(
    pressure,
    newlyDefeatedIds(battle, pressure.state.battle!.entities),
  );
  if (!battle.encounter) return removed;
  const ended = endAfterCasualties(removed);
  if (ended) return ended;
  if (
    turn.type === "hero" &&
    removed.state.battle!.entities.find((e) => e.id === turn.actorId)!.dead
  )
    return finishTurn(removed.state, turn.actorId, removed.events);
  const threat = applyBossThreatStressOnProvisionUse(removed.state, target.id);
  if (threat.events.some((e) => e.type === "commandRefused")) return threat;
  return { ...threat, events: [...removed.events, ...threat.events] };
}
