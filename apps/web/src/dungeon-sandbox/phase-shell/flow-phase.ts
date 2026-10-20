import type { GameState } from "@ddbg/engine";

export const FLOW_PHASE_BREADCRUMB = [
  { id: "questSetup", label: "开局建队" },
  { id: "hamlet", label: "村庄" },
  { id: "expeditionPrep", label: "出征准备" },
  { id: "dungeonExploration", label: "地牢探索" },
  { id: "battle", label: "战斗" },
  { id: "questReturn", label: "回村结算" },
] as const;

export type FlowPhaseId = (typeof FLOW_PHASE_BREADCRUMB)[number]["id"];

export function resolveFlowPhase(opts: {
  readonly questSetupActive?: boolean;
  readonly game: GameState;
}): FlowPhaseId {
  if (opts.questSetupActive) return "questSetup";
  if (opts.game.battle) return "battle";
  const d = opts.game.dungeon;
  if (!d) return "questSetup";
  if (d.hamlet) return "hamlet";
  if (d.hamletReturn || d.phase === "exited") return "questReturn";
  if (d.phase === "awaitingProvisions" || (d.startingProvisionChoices?.length ?? 0) > 0) {
    return "expeditionPrep";
  }
  return "dungeonExploration";
}

export function flowPhaseLabel(id: FlowPhaseId): string {
  return FLOW_PHASE_BREADCRUMB.find((p) => p.id === id)!.label;
}
