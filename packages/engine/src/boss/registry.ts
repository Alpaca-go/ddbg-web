import type { BossScriptDefinition, BossScriptId } from "./types";

const scripts = new Map<BossScriptId, BossScriptDefinition>();

export function registerBossScript(definition: BossScriptDefinition): void {
  if (scripts.has(definition.id) && scripts.get(definition.id) !== definition) {
    throw new Error(`Boss 脚本 id 冲突：${definition.id}`);
  }
  scripts.set(definition.id, definition);
}

export function getBossScript(id: BossScriptId): BossScriptDefinition | undefined {
  return scripts.get(id);
}

export function listBossScripts(): readonly BossScriptDefinition[] {
  return [...scripts.values()];
}

/** 测试或后续 PR 可清空；正式战役应只增不减。 */
export function clearBossScriptsForTest(): void {
  scripts.clear();
}
