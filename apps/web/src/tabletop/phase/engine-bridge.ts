import type { GameState } from "@ddbg/engine";
import { dungeonFlowStep } from "./dungeon-flow-step";
import { resolveFlowPhase, type FlowPhaseId } from "./flow-phase";

/** 将正式 `GameState` 接入桌面原型的只读桥（T1：阶段与步骤文案；世界数据后续 PR 填充）。 */
export type TabletopEngineBridge = {
  readonly game: GameState | null;
  readonly questSetupActive?: boolean;
};

export function resolveEffectiveFlowPhase(
  bridge: TabletopEngineBridge,
  demoPhaseOverride: FlowPhaseId | null,
  mockDefaultPhase: FlowPhaseId,
): FlowPhaseId {
  if (demoPhaseOverride) return demoPhaseOverride;
  if (bridge.game) {
    const opts = bridge.questSetupActive
      ? { game: bridge.game, questSetupActive: bridge.questSetupActive }
      : { game: bridge.game };
    return resolveFlowPhase(opts);
  }
  return mockDefaultPhase;
}

export function resolveFlowStepText(
  bridge: TabletopEngineBridge,
  demoPhaseOverride: FlowPhaseId | null,
  effectivePhase: FlowPhaseId,
): string {
  if (bridge.game && !demoPhaseOverride) {
    return dungeonFlowStep(bridge.game);
  }
  if (demoPhaseOverride) {
    return `（mock 演示）当前阶段：${demoPhaseOverride} · 未接引擎存档`;
  }
  if (effectivePhase === "battle") {
    return "（mock）战斗原型 · 选技能 → 确认展示写死骰子";
  }
  return `（mock）${effectivePhase} 阶段占位 · 步骤文案将接 dungeonFlowStep(game)`;
}

/** 供未来 T2+ 使用的适配入口：从引擎状态投影桌面世界（当前返回空，保持 mock 数据）。 */
export function adaptGameStateToTabletopWorld(_game: GameState): null {
  void _game;
  return null;
}
