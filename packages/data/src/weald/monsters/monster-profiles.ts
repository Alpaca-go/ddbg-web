import { wealdMonsterProfileSchema } from "./monster-rulings";
import type { NormalizedMonsterLargeCard } from "../../shared/schema";

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
