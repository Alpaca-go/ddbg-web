import { ensureShriekerHigherScriptsRegistered } from "./boss/shrieker-higher";
import { ensurePounderHigherScriptsRegistered } from "./boss/pounder-higher";
import { ensureHagIBossScriptRegistered } from "./boss/hag-i";
import { ensureHagHigherScriptsRegistered } from "./boss/hag-higher";
export function registerWealdBosses() {
  ensureShriekerHigherScriptsRegistered();
  ensureHagIBossScriptRegistered();
  ensureHagHigherScriptsRegistered();
  ensurePounderHigherScriptsRegistered();
}
export { WEALD_BOSS_IDENTITIES, WEALD_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { WealdBossIdentity } from "./catalog";
