import { ensureSirenIBossScriptRegistered } from "./boss/siren-i";
export function registerCoveBosses() {
  ensureSirenIBossScriptRegistered();
}
export { COVE_BOSS_IDENTITIES, COVE_BOSS_DESCRIPTION_CARD_ID } from "./catalog";
export type { CoveBossIdentity } from "./catalog";
