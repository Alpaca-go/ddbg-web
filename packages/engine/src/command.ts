export type GameState = {
  readonly seed: number;
  readonly notes: readonly string[];
};

/** 玩家决策未完成时，UI 只呈现这些选项。 */
export type PendingChoice = {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
};

export type Command = {
  readonly type: "ping";
  readonly message: string;
};

export type GameEvent = {
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
 * 命令骨架。`ping` 只回声，不含任何游戏规则。
 * 需要决策的命令以后把 `pendingChoice` 填上，不在这里询问 UI。
 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
  return {
    state: { seed: state.seed, notes: [...state.notes, command.message] },
    events: [{ type: "pong", message: command.message }],
  };
}
