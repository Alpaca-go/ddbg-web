import type { DungeonState } from "../dungeon";
import { syncHamletBlockedBuildingsForBossThreat } from "./threat-campaign";
import type { BossScriptId } from "./types";

/** 写入 / 清除 `activeBossThreatScriptId` 并同步村庄封锁（不含 RNG 抽牌）。 */
export function applyActiveBossThreatToDungeon(
  d: DungeonState,
  scriptId: BossScriptId | null,
): DungeonState {
  const { activeBossThreatScriptId: _previous, ...dungeonBase } = d;
  void _previous;
  let dungeon = scriptId ? { ...dungeonBase, activeBossThreatScriptId: scriptId } : dungeonBase;
  if (dungeon.hamlet) {
    dungeon = {
      ...dungeon,
      hamlet: syncHamletBlockedBuildingsForBossThreat(dungeon, dungeon.hamlet),
    };
  }
  return dungeon;
}
