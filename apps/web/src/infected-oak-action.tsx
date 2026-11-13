import { readInfectedOakAction, type Command, type GameState } from "@ddbg/engine";

export function InfectedOakAction({
  game,
  dispatch,
  frozen = false,
}: {
  readonly game: GameState;
  readonly dispatch: (command: Command) => void;
  readonly frozen?: boolean;
}) {
  const action = readInfectedOakAction(game);
  if (!action) return null;
  return (
    <fieldset data-action-group="loot" data-testid="infected-oak-action">
      <legend>房间交互 · Infected Oak</legend>
      <button
        type="button"
        disabled={frozen || action.disabledReason !== null}
        onClick={() => dispatch(action.command)}
      >
        消毒橡树（1行动＋1药水）
      </button>
      {action.disabledReason && <p>{action.disabledReason}</p>}
    </fieldset>
  );
}
