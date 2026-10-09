import { playHeroSkill, rejectBattleCommand } from "./battle";
import type { BattleState, PlayHeroSkillCommand } from "./battle";
import type { HeroSkillResolution } from "./hero-skill";

export type GameState = {
  readonly seed: number;
  readonly notes: readonly string[];
  readonly battle?: BattleState;
};

/** 玩家决策未完成时，UI 只呈现这些选项。 */
export type PendingChoice = {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
};

export type Command =
  | PlayHeroSkillCommand
  | {
      readonly type: "resolveChoice";
      readonly choiceId: string;
      readonly optionId: string;
    }
  | {
      readonly type: "ping";
      readonly message: string;
    };

export type GameEvent =
  | {
      readonly type: "heroSkillResolved";
      readonly message: string;
      readonly actorId: string;
      readonly roll: number | null;
      readonly resolution: HeroSkillResolution;
    }
  | {
      readonly type: "commandRefused";
      readonly message: string;
    }
  | {
      readonly type: "pong";
      readonly message: string;
    };

export type ApplyResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly pendingChoice?: PendingChoice;
};

export function createInitialState(seed: number): GameState {
  return { seed, notes: [] };
}

/**
 * Phase 2 单目标战斗沙盒；规则书第 19–21 页、R-024、R-031、R-048。
 * 等待方向选择时冻结其他命令，不消耗骰子。
 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
  if (command.type === "resolveChoice") {
    const pending = state.battle?.pending;
    if (
      !pending ||
      pending.choice.id !== command.choiceId ||
      (command.optionId !== "push" && command.optionId !== "pull")
    ) {
      return rejectBattleCommand(state, "选择不存在、已过期或选项无效");
    }
    return playHeroSkill(state, { ...pending.command, shuffleChoice: command.optionId });
  }
  if (state.battle?.pending) return rejectBattleCommand(state, "请先完成待选方向");
  if (command.type === "playHeroSkill") return playHeroSkill(state, command);
  return {
    state: { ...state, notes: [...state.notes, command.message] },
    events: [{ type: "pong", message: command.message }],
  };
}
