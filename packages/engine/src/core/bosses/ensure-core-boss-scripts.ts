import { ensureHigherRuinsBossScriptsRegistered } from "./ruins/ruins-higher";
import { ensureNecromancerIIIBossScriptRegistered } from "./necromancer/necromancer-iii";
import { ensureCollectorIBossScriptRegistered } from "./collector/collector-i";
import { ensureFanaticIBossScriptRegistered } from "./fanatic/fanatic-i";
import { ensureNecromancerIBossScriptRegistered } from "./necromancer/necromancer-i";
import { ensureNecromancerIIBossScriptRegistered } from "./necromancer/necromancer-ii";
import { ensureProphetIBossScriptRegistered } from "./prophet/prophet-i";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest/darkest-mid-boss-scripts";

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
