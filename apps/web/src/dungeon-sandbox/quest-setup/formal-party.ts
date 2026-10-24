import { battleData as questBattleData } from "virtual:quest-battle-data";
import { embarkSkillAllowed, skillBelongsToFormalHero, type FormalHeroName } from "@ddbg/engine";

export const defaultPartyNames: FormalHeroName[] = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
export const stanceLabels = {
  aggressive: "进攻",
  defensive: "防御",
  ranged: "远程",
  support: "支援",
} as const;
export function formalHeroLevel1Skills(name: FormalHeroName) {
  return questBattleData.skills.filter(
    (s) => skillBelongsToFormalHero(name, s) && s.level === 1 && embarkSkillAllowed(name, s),
  );
}

export function toggleEmbarkSkillIds(skillIds: readonly string[], skillId: string) {
  if (skillIds.includes(skillId)) return skillIds.filter((id) => id !== skillId);
  if (skillIds.length >= 3) return [...skillIds];
  return [...skillIds, skillId];
}

export function formalPartySlot(name: FormalHeroName, index: number) {
  const stat =
    questBattleData.heroStats.find((s) => s.name === name && s.level === 1) ??
    questBattleData.heroStats.find((s) => s.name === name)!;
  return {
    heroStatId: stat.id,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
    skillIds: formalHeroLevel1Skills(name)
      .slice(0, 3)
      .map((s) => s.id),
  };
}
