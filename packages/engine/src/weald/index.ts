import { ensureShriekerHigherScriptsRegistered } from "./bosses/shrieker/shrieker-higher";
import { ensurePounderHigherScriptsRegistered } from "./bosses/pounder/pounder-higher";
import { ensureHagIBossScriptRegistered } from "./bosses/hag/hag-i";
import { ensureHagHigherScriptsRegistered } from "./bosses/hag/hag-higher";
export function registerWealdBosses() {
  ensureShriekerHigherScriptsRegistered();
  ensureHagIBossScriptRegistered();
  ensureHagHigherScriptsRegistered();
  ensurePounderHigherScriptsRegistered();
}
export { WEALD_BOSS_IDENTITIES, WEALD_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { WealdBossIdentity } from "./catalog";
