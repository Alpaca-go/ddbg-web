/** Fortunate Armlet，核心盒饰品 p025，规则书 R26。 */
export const FORTUNATE_ARMLET_RULE = {
  id: "trinket:p025",
  name: "Fortunate Armlet",
  level: 2,
  accuracy: 1,
  crit: 1,
  useStress: 1,
} as const;
export const TRINKET_RULES = [FORTUNATE_ARMLET_RULE] as const;

/** 核心盒饰品卡 p003／004／008／011，规则书 R21、R26。 */
export const STATUS_CHARM_RULES = {
  "trinket:p003": { kind: "bleed", amount: 2, duration: 2 },
  "trinket:p004": { kind: "blight", amount: 2, duration: 2 },
  "trinket:p008": { kind: "debuff", duration: 2 },
  "trinket:p011": { kind: "stun", duration: 1 },
} as const;

export function isStatusCharm(id: string): id is keyof typeof STATUS_CHARM_RULES {
  return Object.hasOwn(STATUS_CHARM_RULES, id);
}
