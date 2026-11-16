import { ensureHagIBossScriptRegistered } from "./boss/hag-i";
import { ensureHagHigherScriptsRegistered } from "./boss/hag-higher";
export function registerWealdBosses() {
  ensureHagIBossScriptRegistered();
  ensureHagHigherScriptsRegistered();
}
export { WEALD_BOSS_IDENTITIES, WEALD_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { WealdBossIdentity } from "./catalog";
