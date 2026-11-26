import { ensureSwinePrinceIBossScriptRegistered } from "./bosses/swine-prince/swine-prince-i";
import { ensureFleshIBossScriptRegistered } from "./bosses/flesh/flesh-i";
export function registerWarrensBosses() {
  ensureSwinePrinceIBossScriptRegistered();
  ensureFleshIBossScriptRegistered();
}
export { WARRENS_BOSS_IDENTITIES, WARRENS_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { WarrensBossIdentity } from "./catalog";
