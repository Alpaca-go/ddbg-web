import { battleData as questBattleData } from "virtual:quest-battle-data";
import type { FormalHeroName } from "@ddbg/engine";

export const defaultPartyNames: FormalHeroName[] = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
export const stanceLabels = {
  aggressive: "进攻",
  defensive: "防御",
  ranged: "远程",
  support: "支援",
} as const;
export function formalPartySlot(name: FormalHeroName, index: number) {
  const stat = questBattleData.heroStats.find((s) => s.name === name && s.level === 1)!;
  return {
    heroStatId: stat.id,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
    skillIds: questBattleData.skills
      .filter((s) => s.hero === name && s.level === 1 && !s.verification.unverified)
      .slice(0, 3)
      .map((s) => s.id),
  };
}
