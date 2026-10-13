import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { resolveHeroHealth } from "./hero-health";
import { passiveHeal, passiveStress } from "./passive";
import { PROVISION_EFFECTS } from "./provision-use";
import type { UseProvisionCommand } from "./provision-use";
import { statusProjection, statusStackProblem } from "./status";
import { triggerDungeonPassive } from "./dungeon-passive";
import { settleDungeonLight, useDungeonTorch } from "./dungeon-light";

/** R12 / 规格书§5.2：完成效果之间使用补给；各颗是独立事件，不套Q-69休息分组。 */
export function useDungeonProvision(state: GameState, command: UseProvisionCommand): ApplyResult {
  if (command.effect === "raiseLight") return useDungeonTorch(state, command);
  const d = state.dungeon;
  const setup = d?.explorationSetup;
  const target = d?.heroes.find((h) => h.id === command.targetId);
  const provision = setup?.provisions.find((p) => p.id === command.provisionId);
  if (
    !d ||
    state.battle ||
    d.phase !== "ready" ||
    d.pending ||
    !setup ||
    !target ||
    target.dead ||
    d.heroes.some(
      (h) => h.dead || !Number.isSafeInteger(h.stress) || h.stress < 0 || h.stress > 9,
    ) ||
    d.heroes.some((h) => {
      const stacks = h.statusStacks ?? h.combat?.statusStacks;
      return stacks !== undefined && !!statusStackProblem(stacks);
    }) ||
    new Set(d.heroes.map((h) => h.id)).size !== d.heroes.length ||
    !Number.isSafeInteger(setup.light) ||
    setup.light < 0 ||
    setup.light > 5 ||
    setup.provisions.length > 16 ||
    new Set(setup.provisions.map((p) => p.id)).size !== setup.provisions.length ||
    !provision ||
    !(PROVISION_EFFECTS[provision.face] as readonly string[] | undefined)?.includes(
      command.effect,
    ) ||
    d.roomCards?.active ||
    d.monsterPool?.active ||
    d.curio?.active ||
    d.pendingCurioDraw ||
    (d.roomResolution && !d.roomResolution.completed)
  )
    return rejectBattleCommand(
      state,
      "地牢补给须在导航就绪、完整效果之间使用；补给或目标无效（R12）",
    );
  let updated = target;
  if (command.effect === "heal") {
    if (
      target.attributesVerified !== true ||
      target.life === undefined ||
      target.wounds === undefined
    )
      return rejectBattleCommand(state, "补给治疗缺已核实Life / 伤口（R-048）");
    const health = resolveHeroHealth(
      { life: target.life, wounds: target.wounds, dead: false },
      { type: "heal", amount: passiveHeal(target, 1) },
    );
    if (health.status !== "resolved") return rejectBattleCommand(state, "补给治疗数据无效");
    updated = { ...target, wounds: health.state.wounds };
  } else if (command.effect === "reduceStress") {
    if (!Number.isSafeInteger(target.stress) || target.stress < 0 || target.stress > 9)
      return rejectBattleCommand(state, "补给减压缺有效压力（R-048）");
    updated = {
      ...target,
      stress: Math.max(0, target.stress + passiveStress(target, -1, setup.light).amount),
    };
  } else {
    const stacks = target.statusStacks ?? target.combat?.statusStacks;
    if (!stacks || statusStackProblem(stacks))
      return rejectBattleCommand(state, "移除状态需要完整已知状态堆叠（R-048）");
    const kind = command.effect === "clearBleed" ? "bleed" : "blight";
    const remaining = stacks.filter((s) => s.kind !== kind);
    updated = {
      ...target,
      statusStacks: remaining,
      ...statusProjection(remaining, target.innateProtection ?? target.combat?.innateProtection),
    };
  }
  let result: ApplyResult = {
    state: {
      ...state,
      dungeon: {
        ...d,
        pressureSource: "provision",
        explorationSetup: {
          ...setup,
          provisions: setup.provisions.filter((p) => p.id !== provision.id),
        },
        heroes: d.heroes.map((h) => (h.id === target.id ? updated : h)),
      },
    },
    events: [
      {
        type: "provisionConsumed",
        entityId: target.id,
        provisionId: provision.id,
        face: provision.face,
        effect: command.effect,
        message: "探索间使用补给，效果已结算，移除一颗骰子（R12）",
      },
    ],
  };
  if (provision.face === "food") {
    const applied = triggerDungeonPassive(
      result.state.dungeon!,
      state.seed,
      [target.id],
      "foodConsumed",
    );
    if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
    result = {
      ...result,
      state: { ...state, dungeon: applied.dungeon },
      events: [...result.events, ...applied.events],
    };
  }
  const settled = settleDungeonLight(result);
  if (settled.events.some((e) => e.type === "commandRefused")) return settled;
  return {
    ...settled,
    state: {
      ...settled.state,
      dungeon: {
        ...settled.state.dungeon!,
        heroes: settled.state.dungeon!.heroes.map((h) => {
          if (!h.combat) return h;
          const stacks = h.statusStacks ?? h.combat.statusStacks;
          return {
            ...h,
            combat: {
              ...h.combat,
              wounds: h.wounds!,
              stress: h.stress,
              dead: h.dead ?? false,
              resolveTested: h.resolveTested ?? false,
              resolveCardId: h.resolveCardId ?? null,
              ...(stacks
                ? {
                    statusStacks: stacks,
                    ...statusProjection(stacks, h.innateProtection ?? h.combat.innateProtection),
                  }
                : {}),
            },
          };
        }),
      },
    },
  };
}
