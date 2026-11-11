import { ensureHagIBossScriptRegistered } from "./boss/hag-i";
export function registerWealdBosses() {
  ensureHagIBossScriptRegistered();
}
export { WEALD_BOSS_IDENTITIES, WEALD_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { WealdBossIdentity } from "./catalog";
