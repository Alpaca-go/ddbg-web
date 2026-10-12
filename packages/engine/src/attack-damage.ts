import { hasQuirk } from "./passive";
import type { PassiveHolder } from "./passive";

/** R-026：防御减伤 → 暴击减半 → Protection；反弹读取 Protection 前的量。 */
export function resolveAttackDamage(
  target: PassiveHolder,
  baseDamage: number,
  critical: boolean,
  protection: boolean,
) {
  const modified = Math.max(0, baseDamage - Number(hasQuirk(target, "On Guard")));
  const beforeProtection =
    critical && hasQuirk(target, "Hard Skinned") ? Math.ceil(modified / 2) : modified;
  return {
    beforeProtection,
    damageDealt: protection ? Math.ceil(beforeProtection / 2) : beforeProtection,
  };
}
