import {
  embarkStanceForRosterSlot,
  preferredEmbarkStanceFromSelectedSkills,
  resolveEmbarkRosterSlotIndex,
  type EmbarkRosterSlotIndex,
} from "@ddbg/engine";
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

export function assignEmbarkRosterSlotForSeat(
  seatIndex: number,
  skillIds: readonly string[],
  rosterSlotBySeat: readonly (number | null)[],
  skillsConfirmedBySeat: readonly boolean[],
): { rosterSlot: EmbarkRosterSlotIndex; stance: ReturnType<typeof embarkStanceForRosterSlot> } {
  const skills = skillIds
    .map((id) => questBattleData.skills.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  const preferred = preferredEmbarkStanceFromSelectedSkills(skills);
  const occupied = new Set<number>();
  for (let i = 0; i < rosterSlotBySeat.length; i++) {
    if (i === seatIndex || !skillsConfirmedBySeat[i]) continue;
    const slot = rosterSlotBySeat[i];
    if (slot != null) occupied.add(slot);
  }
  const rosterSlot = resolveEmbarkRosterSlotIndex(preferred, occupied);
  return { rosterSlot, stance: embarkStanceForRosterSlot(rosterSlot) };
}

export function applyRosterSlotsToParty<
  T extends { readonly stance: ReturnType<typeof embarkStanceForRosterSlot> },
>(
  party: readonly T[],
  rosterSlotBySeat: readonly (number | null)[],
  skillsConfirmedBySeat: readonly boolean[],
): T[] {
  return party.map((hero, seatIndex) => {
    const slot = rosterSlotBySeat[seatIndex];
    if (!skillsConfirmedBySeat[seatIndex] || slot === null) return hero;
    return { ...hero, stance: embarkStanceForRosterSlot(slot as EmbarkRosterSlotIndex) };
  });
}
