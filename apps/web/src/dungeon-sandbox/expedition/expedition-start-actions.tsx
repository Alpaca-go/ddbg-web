import { getBossScript } from "@ddbg/engine";
import type { DungeonState } from "@ddbg/engine";
import type { DungeonDispatch } from "../view-props";
import { needsInitialThreat } from "../initial-threat";

export function ExpeditionStartActions({
  dungeon,
  formal,
  pending,
  dispatch,
}: {
  readonly dungeon: DungeonState;
  readonly formal: boolean;
  readonly pending: boolean;
  readonly dispatch: DungeonDispatch;
}) {
  const missing = formal && needsInitialThreat(dungeon);
  const threat = dungeon.activeBossThreatScriptId
    ? getBossScript(dungeon.activeBossThreatScriptId)
    : undefined;
  return (
    <div data-testid="expedition-start-actions">
      {missing && (
        <div data-testid="initial-threat-setup">
          <p>新战役先从四名遗迹 Boss 中随机确定迫近威胁，再掷开局补给骰。</p>
          <button disabled={pending} onClick={() => dispatch({ type: "establishImminentThreat" })}>
            抽取迫近威胁
          </button>
        </div>
      )}
      {formal && dungeon.imminentThreatDescriptionCardId && (
        <p data-testid="initial-threat-result">迫近威胁：{threat?.displayName ?? "已确定"}</p>
      )}
      <button
        disabled={pending || missing}
        onClick={() => dispatch({ type: "rollDungeonProvisions" })}
      >
        掷开局补给骰
      </button>
    </div>
  );
}
