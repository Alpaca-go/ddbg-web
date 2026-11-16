import {
  readInfectedOakAction,
  readWealdOakAction,
  type Command,
  type GameState,
} from "@ddbg/engine";

export function InfectedOakAction({
  game,
  dispatch,
  frozen = false,
}: {
  readonly game: GameState;
  readonly dispatch: (command: Command) => void;
  readonly frozen?: boolean;
}) {
  const burning = readWealdOakAction(game);
  const action = burning ?? readInfectedOakAction(game);
  if (!action) return null;
  return (
    <fieldset data-action-group="loot" data-testid="infected-oak-action">
      <legend>房间交互 · Infected Oak</legend>
      <button
        type="button"
        disabled={frozen || action.disabledReason !== null}
        onClick={() => dispatch(action.command)}
      >
        {burning ? "点燃橡树（1行动＋1火把）" : "消毒橡树（1行动＋1药水）"}
      </button>
      {action.disabledReason && <p>{action.disabledReason}</p>}
      {burning && game.battle?.wealdOakIgnitedRound !== undefined && (
        <p>
          {game.battle.wealdOakBurnt
            ? "橡树已烧毁，目标已清理；战斗继续按实际终局交接。"
            : `橡树燃烧中，等待第${game.battle.wealdOakIgnitedRound + 1}轮结束。`}
        </p>
      )}
    </fieldset>
  );
}
