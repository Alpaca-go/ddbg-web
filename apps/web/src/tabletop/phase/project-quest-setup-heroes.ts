import type { QuestParty } from "@ddbg/engine";
import type { TabletopHeroState } from "../tabletop-types";

function emptySeat(seat: number): TabletopHeroState {
  return {
    id: `party-slot-${seat}`,
    hero: "—",
    wounds: 0,
    life: 0,
    lifeKnown: false,
    stress: 0,
    stressFace: null,
    stance: "support",
    areaId: "—",
    heroLevel: 0,
    skillIds: [],
    statusStacks: [],
    trinketSlotCount: 0,
    trinkets: [],
    seat,
    actedThisRound: false,
    isCurrentActor: false,
    dead: false,
    isEmpty: true,
    quirkCount: 0,
    diseaseCount: 0,
  };
}

/** 开局建队表单：左栏只展示已选英雄名与技能数，生命等未开局字段为「—」。 */
export function projectQuestSetupHeroes(
  party: QuestParty,
  displayNames: readonly string[],
): TabletopHeroState[] {
  const rows: TabletopHeroState[] = party.map((slot, index) => {
    const seat = index + 1;
    const name = displayNames[index] ?? "—";
    return {
      id: `hero-${index}`,
      hero: name,
      heroStatId: slot.heroStatId,
      wounds: 0,
      life: 0,
      lifeKnown: false,
      stress: 0,
      stressFace: null,
      stance: slot.stance,
      areaId: "—",
      heroLevel: 1,
      skillIds: [...slot.skillIds],
      statusStacks: [],
      trinketSlotCount: 1,
      trinkets: [],
      seat,
      actedThisRound: false,
      isCurrentActor: false,
      dead: false,
      isEmpty: false,
      quirkCount: 0,
      diseaseCount: 0,
    };
  });
  for (let seat = rows.length + 1; seat <= 4; seat += 1) {
    rows.push(emptySeat(seat));
  }
  return rows.slice(0, 4);
}
