import type { Command, GameEvent, GameState } from "@ddbg/engine";

export type DungeonDispatch = (command: Command) => void;

export type DungeonViewProps = {
  game: GameState;
  dispatch: DungeonDispatch;
  events: readonly GameEvent[];
  commands: readonly Command[];
  formal: boolean;
};
