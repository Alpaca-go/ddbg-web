import { ensureCollectorIBossScriptRegistered } from "./collector-i";
import { ensureFanaticIBossScriptRegistered } from "./fanatic-i";
import { ensureFleshIBossScriptRegistered } from "./flesh-i";
import { ensureHagIBossScriptRegistered } from "./hag-i";
import { ensureNecromancerIBossScriptRegistered } from "./necromancer-i";
import { ensureProphetIBossScriptRegistered } from "./prophet-i";
import { ensureSirenIBossScriptRegistered } from "./siren-i";
import { ensureSwinePrinceIBossScriptRegistered } from "./swine-prince-i";

/** 注册当前已核实的核心盒 / Weald / Warrens / Cove Boss 脚本（无 face-the-threat 钩子依赖）。 */
export function ensureCoreBossScriptsRegistered(): void {
  ensureNecromancerIBossScriptRegistered();
  ensureProphetIBossScriptRegistered();
  ensureCollectorIBossScriptRegistered();
  ensureFanaticIBossScriptRegistered();
  ensureHagIBossScriptRegistered();
  ensureSwinePrinceIBossScriptRegistered();
  ensureSirenIBossScriptRegistered();
  ensureFleshIBossScriptRegistered();
}
