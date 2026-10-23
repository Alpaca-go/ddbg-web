import type { SkillStance } from "./hero-skill";
import { aggregateLitHeroSkillStanceCounts, type HeroSkillCardView } from "./hero-skill";

/** 建队底栏从左到右四格对应的战斗姿态（与 UI 金框顺序一致）。 */
export const EMBARK_ROSTER_SLOT_STANCES = [
  "support",
  "ranged",
  "defensive",
  "aggressive",
] as const satisfies readonly SkillStance[];

/** 并列最高频次时优先更靠前（更靠近进攻 / aggressive 一侧）。 */
export const EMBARK_FRONT_STANCE_PRIORITY = [
  "aggressive",
  "defensive",
  "ranged",
  "support",
] as const satisfies readonly SkillStance[];

export type EmbarkRosterSlotIndex = 0 | 1 | 2 | 3;

export function embarkRosterSlotIndexForStance(stance: SkillStance): EmbarkRosterSlotIndex {
  const index = EMBARK_ROSTER_SLOT_STANCES.indexOf(stance);
  if (index < 0 || index > 3) return 0;
  return index as EmbarkRosterSlotIndex;
}

export function embarkStanceForRosterSlot(slot: EmbarkRosterSlotIndex): SkillStance {
  return EMBARK_ROSTER_SLOT_STANCES[slot];
}

/** 按已选技能点亮姿态频次，并列时取更靠前姿态。 */
export function preferredEmbarkStanceFromLitCounts(
  counts: Record<SkillStance, number>,
): SkillStance {
  const max = Math.max(counts.support, counts.ranged, counts.defensive, counts.aggressive);
  if (max <= 0) return "support";
  for (const stance of EMBARK_FRONT_STANCE_PRIORITY) {
    if (counts[stance] === max) return stance;
  }
  return "support";
}

export function preferredEmbarkStanceFromSelectedSkills(
  skills: readonly Pick<HeroSkillCardView, "top_row_icons">[],
): SkillStance {
  return preferredEmbarkStanceFromLitCounts(aggregateLitHeroSkillStanceCounts(skills));
}

/**
 * 从偏好格起向后（远离 aggressive）找空位；若占满则回退任意空位。
 */
export function resolveEmbarkRosterSlotIndex(
  preferredStance: SkillStance,
  occupiedSlotIndices: ReadonlySet<number>,
): EmbarkRosterSlotIndex {
  let slot = embarkRosterSlotIndexForStance(preferredStance);
  while (slot >= 0) {
    if (!occupiedSlotIndices.has(slot)) return slot;
    slot -= 1;
  }
  for (let s = EMBARK_ROSTER_SLOT_STANCES.length - 1; s >= 0; s--) {
    if (!occupiedSlotIndices.has(s)) return s as EmbarkRosterSlotIndex;
  }
  return 0;
}

/** 底栏拖放：移到目标格；若该格已有英雄则互换站位。 */
export function moveEmbarkRosterSeatToSlot(
  rosterSlotBySeat: readonly (number | null)[],
  fromSeat: number,
  toSlot: EmbarkRosterSlotIndex,
): (number | null)[] {
  const fromSlot = rosterSlotBySeat[fromSeat];
  if (fromSlot === null || fromSlot === toSlot) return [...rosterSlotBySeat];
  const next = rosterSlotBySeat.map((slot) => slot);
  const occupantSeat = next.findIndex((slot, i) => i !== fromSeat && slot === toSlot);
  if (occupantSeat >= 0) {
    next[fromSeat] = toSlot;
    next[occupantSeat] = fromSlot;
  } else {
    next[fromSeat] = toSlot;
  }
  return next;
}
