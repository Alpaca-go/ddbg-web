import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { applyActiveBossThreatToDungeon } from "./apply-active-boss-threat";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
import { getBossScript } from "./registry";
import { bossThreatClearHoldReason, readActiveBossThreatScriptId } from "./threat-campaign";
import type { BossScriptId } from "./types";

export type SetActiveBossThreatCommand = {
  readonly type: "setActiveBossThreat";
  /** null = 清除当前迫近威胁（不含升幕抽下一张；见 bossThreatClearHoldReason）。 */
  readonly scriptId: BossScriptId | null;
};

/**
 * 测试 / 沙盒命令：经 `applyActiveBossThreatToDungeon` 写 `activeBossThreatScriptId` 并同步村庄封锁，
 * 与 `establishImminentThreat` / 升幕抽牌挂接被动相同（不洗描述卡、不耗 RNG）。
 * 正式战役请用 `establishImminentThreat` / `drawImminentThreatAfterActAdvance`（spec §2.4 / §2.2）。
 */
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
  let dungeon = applyActiveBossThreatToDungeon(d, command.scriptId);
  if (command.scriptId !== null) {
    const { unregisteredImminentThreatHold: _hold, ...withoutHold } = dungeon;
    void _hold;
    dungeon = withoutHold;
  }
  const message =
    command.scriptId === null
      ? previous
        ? `已清除迫近威胁 ${previous}（${bossThreatClearHoldReason()}）`
        : "当前无激活迫近威胁"
      : `迫近威胁设为 ${command.scriptId}（stub）；村庄 / 地牢被动已挂接`;
  return {
    state: { ...state, dungeon },
    events: [{ type: "dungeonUpdated", message }],
  };
}
