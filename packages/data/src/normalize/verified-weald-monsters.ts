import {
  WEALD_MONSTER_ATTACKS,
  WEALD_RANGE_ICON_ID,
  wealdEffectSignatures,
  wealdMonsterProfileSchema,
} from "../weald-monster-rulings";
import type { NormalizedMonsterMediumCard, NormalizedMonsterLargeCard } from "./schema";

const all = ["aggressive", "defensive", "ranged", "support"] as const;
type Profile = {
  name: string;
  dodge: number;
  speed: number;
  life: number;
  pages: number[];
  resistance: "blight" | "stun";
  resistanceIcon: string;
  stanceSlots: 1 | 2;
  stanceGroups: NonNullable<NormalizedMonsterLargeCard["stanceGroups"]>;
};
const profiles: Record<string, Profile> = {
  "monster_medium:weald:p001": {
    name: "Ectoplasm",
    life: 6,
    pages: [1, 2, 3],
    resistance: "blight",
    resistanceIcon: "8e690fc7b2",
    stanceSlots: 1,
    dodge: 0,
    speed: 1,
    stanceGroups: [
      {
        stances: [...all],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 8, skill: 2 },
          { min: 9, max: 10, skill: 3 },
        ],
      },
    ],
  },
  "monster_medium:weald:p006": {
    name: "Rabid Gnasher",
    life: 7,
    pages: [6, 7, 8],
    resistance: "stun",
    resistanceIcon: "86bf0146dc",
    stanceSlots: 1,
    dodge: 2,
    speed: 3,
    stanceGroups: [{ stances: [...all], skill: 1 }],
  },
  "monster_medium:weald:p009": {
    name: "Fungal Scratcher",
    life: 14,
    pages: [9, 10, 11],
    resistance: "blight",
    resistanceIcon: "8e690fc7b2",
    stanceSlots: 1,
    dodge: 0,
    speed: 1,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
      { stances: ["ranged", "support"], skill: 3 },
    ],
  },
  "monster_medium:weald:p012": {
    name: "Fungal Artillery",
    life: 9,
    pages: [12, 13, 14],
    resistance: "blight",
    resistanceIcon: "8e690fc7b2",
    stanceSlots: 1,
    dodge: 1,
    speed: 1,
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 3 },
      {
        stances: ["ranged", "support"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
    ],
  },
  "monster_large:weald:p001": {
    name: "Large Ectoplasm",
    life: 22,
    pages: [1, 2],
    resistance: "stun",
    resistanceIcon: "86bf0146dc",
    stanceSlots: 2,
    dodge: 0,
    speed: 1,
    stanceGroups: [
      {
        stances: [...all],
        rollTable: [
          { min: 1, max: 4, skill: 1 },
          { min: 5, max: 8, skill: 2 },
          { min: 9, max: 10, skill: 3 },
        ],
      },
    ],
  },
};

export const WEALD_MONSTER_PROFILES = Object.entries(profiles).map(([cardId, profile]) =>
  wealdMonsterProfileSchema.parse({ ...profile, cardId, ruling: "R-232", immunities: [] }),
);

/** R-230、R-232：附加核准语义；原始图标命名状态保持原状。 */
export function attachVerifiedWealdMonster(
  card: NormalizedMonsterMediumCard,
): NormalizedMonsterMediumCard {
  if (!("skills" in card)) return card;
  const profile = WEALD_MONSTER_PROFILES.find((entry) => entry.cardId === card.id);
  const attacks = WEALD_MONSTER_ATTACKS.filter((entry) => entry.cardId === card.id);
  if (
    !profile ||
    card.name !== profile.name ||
    card.level !== 1 ||
    card.life !== profile.life ||
    JSON.stringify(card.pages) !== JSON.stringify(profile.pages) ||
    card.resistances.length !== 1 ||
    card.resistances[0]?.iconId !== profile.resistanceIcon ||
    card.immunities.length !== 0 ||
    card.skills.length !== attacks.length
  )
    throw new Error(`Weald R-230 卡身份不符：${card.id}`);
  return {
    ...card,
    verified_weald_profile: profile,
    dodge: profile.dodge,
    speed: profile.speed,
    stanceGroups: profile.stanceGroups,
    skills: card.skills.map((skill) => {
      const entry = attacks.find((entry) => entry.slot === skill.slot);
      const number = (label: string) =>
        skill.unlabeled_numbers.find(
          (n) => n.anchor.type === "printed_label" && n.anchor.label === label,
        )?.numeric;
      const ranges = skill.unlabeled_numbers.filter(
        (n) =>
          n.anchor.type === "beside_icon" &&
          n.anchor.left_icon?.iconId === WEALD_RANGE_ICON_ID &&
          n.anchor.inside_icon === null,
      );
      if (
        !entry ||
        entry.name !== skill.name ||
        skill.printed_labels.find((label) => label.label === "Crit")?.value !== entry.crit ||
        skill.printed_labels.find((label) => label.label === "Acc")?.value !== entry.acc ||
        number("Crit") !== entry.criticalDamage ||
        number("Acc") !== entry.damage ||
        ranges.length !== 1 ||
        ranges[0]?.numeric !== entry.range ||
        skill.target?.replace(/\s+/g, "") !== entry.target.replace(/\s+/g, "") ||
        JSON.stringify(wealdEffectSignatures(skill.effect_lines)) !==
          JSON.stringify(entry.effectSignatures)
      )
        throw new Error(`Weald R-230 技能卡面漂移：${card.id} / ${skill.slot}`);
      return { ...skill, target: entry.target, verified_weald_attack: entry };
    }),
  };
}
