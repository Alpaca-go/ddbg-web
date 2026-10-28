import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
import { getBossScript } from "./registry";
import {
  bossThreatClearHoldReason,
  readActiveBossThreatScriptId,
  syncHamletBlockedBuildingsForBossThreat,
} from "./threat-campaign";
import type { BossScriptId } from "./types";

export type SetActiveBossThreatCommand = {
  readonly type: "setActiveBossThreat";
  /** null = 清除当前迫近威胁（不含升幕抽下一张；见 bossThreatClearHoldReason）。 */
  readonly scriptId: BossScriptId | null;
};

export function setActiveBossThreat(
  state: GameState,
  command: SetActiveBossThreatCommand,
): ApplyResult {
  if (state.battle) return rejectBattleCommand(state, "战斗进行中不能定威胁（R-048）");
  const d = state.dungeon;
  if (!d) return rejectBattleCommand(state, "缺少战役状态，不能定威胁");
  if (command.scriptId !== null) {
    ensureCoreBossScriptsRegistered();
    if (!getBossScript(command.scriptId))
      return rejectBattleCommand(state, `未知或未注册的 Boss 脚本：${command.scriptId}`);
  }
  const previous = readActiveBossThreatScriptId(d);
  const { activeBossThreatScriptId: _previousThreat, ...dungeonBase } = d;
  void _previousThreat;
  let dungeon = command.scriptId
    ? { ...dungeonBase, activeBossThreatScriptId: command.scriptId }
    : dungeonBase;
  if (dungeon.hamlet) {
    dungeon = {
      ...dungeon,
      hamlet: syncHamletBlockedBuildingsForBossThreat(dungeon, dungeon.hamlet),
    };
  }
  const message =
    command.scriptId === null
      ? previous
        ? `已清除迫近威胁 ${previous}（${bossThreatClearHoldReason()}）`
        : "当前无激活迫近威胁"
      : `迫近威胁设为 ${command.scriptId}；村庄 / 地牢被动已挂接`;
  return {
    state: { ...state, dungeon },
    events: [{ type: "dungeonUpdated", message }],
  };
}
