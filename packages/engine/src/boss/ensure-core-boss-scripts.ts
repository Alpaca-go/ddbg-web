import { ensureHigherRuinsBossScriptsRegistered } from "./ruins-higher";
import { ensureNecromancerIIIBossScriptRegistered } from "./necromancer-iii";
import { ensureCollectorIBossScriptRegistered } from "./collector-i";
import { ensureFanaticIBossScriptRegistered } from "./fanatic-i";
import { ensureNecromancerIBossScriptRegistered } from "./necromancer-i";
import { ensureNecromancerIIBossScriptRegistered } from "./necromancer-ii";
import { ensureProphetIBossScriptRegistered } from "./prophet-i";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";

/** 仅注册核心盒；扩展由各包入口独立注册。 */
export function ensureCoreBossScriptsRegistered(): void {
  ensureDarkestMidBossScriptsRegistered();
  ensureHigherRuinsBossScriptsRegistered();
  ensureNecromancerIIIBossScriptRegistered();
  ensureNecromancerIBossScriptRegistered();
  ensureNecromancerIIBossScriptRegistered();
  ensureProphetIBossScriptRegistered();
  ensureCollectorIBossScriptRegistered();
  ensureFanaticIBossScriptRegistered();
}
