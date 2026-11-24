import type { BossCombatEntryRefs, BossScriptDefinition } from "./types";

/** 从已注册脚本读取战斗卡 / 能力卡引用；不含 encounter 部署逻辑。 */
export function readBossCombatEntry(
  script: BossScriptDefinition | undefined,
): BossCombatEntryRefs | undefined {
  return script?.combatEntry;
}
