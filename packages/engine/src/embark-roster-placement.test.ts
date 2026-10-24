import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import type { HeroSkillCardView } from "./hero-skill";
import {
  embarkRosterSlotIndexForStance,
  preferredEmbarkStanceFromSelectedSkills,
  moveEmbarkRosterSeatToSlot,
  resolveEmbarkRosterSlotIndex,
} from "./embark-roster-placement";

const smite = loadNormalizedCorebox().hero_skill.cards.find(
  (c) => c.id === "hero_skill:p001",
)! as HeroSkillCardView;

describe("embark roster placement", () => {
  it("prefers stance with highest lit count; ties favor aggressive", () => {
    const judgement = loadNormalizedCorebox().hero_skill.cards.find(
      (c) => c.id === "hero_skill:p016",
    )! as HeroSkillCardView;
    expect(preferredEmbarkStanceFromSelectedSkills([smite])).toBe("aggressive");
    expect(preferredEmbarkStanceFromSelectedSkills([smite, judgement])).toBe("aggressive");
  });

  it("maps stance to roster slot index left-to-right", () => {
    expect(embarkRosterSlotIndexForStance("support")).toBe(0);
    expect(embarkRosterSlotIndexForStance("aggressive")).toBe(3);
  });

  it("shifts backward when preferred slot is occupied", () => {
    const occupied = new Set([3]);
    expect(resolveEmbarkRosterSlotIndex("aggressive", occupied)).toBe(2);
    expect(resolveEmbarkRosterSlotIndex("aggressive", new Set([3, 2]))).toBe(1);
  });

  it("moves or swaps roster slots when dragging portraits", () => {
    const slots = [3, 1, null, null] as (number | null)[];
    expect(moveEmbarkRosterSeatToSlot(slots, 0, 2)).toEqual([2, 1, null, null]);
    expect(moveEmbarkRosterSeatToSlot([3, 1, 0, 2], 0, 1)).toEqual([1, 3, 0, 2]);
    expect(moveEmbarkRosterSeatToSlot([3, 1, 0, 2], 0, 3)).toEqual([3, 1, 0, 2]);
  });
});
