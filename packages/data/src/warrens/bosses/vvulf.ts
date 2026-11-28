import { z } from "zod";
import {
  WARRENS_BOSS_ABILITIES_BACK,
  WARRENS_BOSS_ABILITIES_FRONT,
  WARRENS_MONSTER_LARGE_BACK,
  WARRENS_MONSTER_LARGE_FRONT,
} from "../print";
import { warrensBossTileStubSchema } from "../tiles/boss-tile";

const pendingIcon = z.strictObject({ kind: z.literal("pendingIcon"), note: z.string().min(1) });

const vvulfSkillSchema = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.literal("crowded"),
  range: z.int().positive(),
  maxTargets: z.literal(2),
  crit: z.int().nonnegative(),
  critDamage: z.int().nonnegative(),
  accuracy: z.int().nonnegative(),
  damage: z.int().nonnegative(),
  effects: z.array(pendingIcon),
});

const vvulfFaceSchema = z.strictObject({
  role: z.literal("vvulf"),
  rawId: z.enum([
    "monster_large:warrens:p002",
    "monster_large:warrens:p003",
    "monster_large:warrens:p004",
  ]),
  face: z.literal("front"),
  name: z.literal("Brigand Vvulf"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  types: z.tuple([z.literal("human"), z.literal("large")]),
  stanceSlots: z.literal(2),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.literal(5),
  resistances: z.array(z.never()),
  immunities: z.array(z.never()),
  skills: z.array(vvulfSkillSchema).length(3),
  selection: z.array(z.strictObject({ min: z.int(), max: z.int(), slot: z.int() })).length(3),
});

export const warrensVvulfIContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-vvulf-i-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  pendingReview: z.array(z.string()).min(1),
  sources: z.strictObject({
    combatFront: z.literal(WARRENS_MONSTER_LARGE_FRONT),
    combatBack: z.literal(WARRENS_MONSTER_LARGE_BACK),
    abilityFront: z.literal(WARRENS_BOSS_ABILITIES_FRONT),
    abilityBack: z.literal(WARRENS_BOSS_ABILITIES_BACK),
  }),
  faces: z.tuple([vvulfFaceSchema]),
  abilities: z.strictObject({
    descriptionCardId: z.literal("boss_ability:warrens:p001"),
    combatCardId: z.literal("boss_ability:warrens:p004"),
    actionsPerRound: z.literal(2),
    ruleSummaries: z.array(z.string()).min(1),
    threats: z.strictObject({
      dungeon: z.strictObject({
        name: z.literal("Brigand Ambush I"),
        summary: z.string(),
        recordedOnly: z.literal(true),
      }),
      hamlet: z.strictObject({
        name: z.literal("Stolen Material I"),
        summary: z.string(),
        recordedOnly: z.literal(true),
      }),
    }),
    barrelOBombs: z.strictObject({
      miniatureNote: z.literal(true),
      removeAndDamage: z.literal(10),
    }),
  }),
  setup: z.strictObject({
    rule: z.literal("Warrens W4"),
    vvulfStance: z.literal("aggressive"),
    monsterInitiativeCards: z.literal(2),
    heroInitiativeCards: z.literal(4),
  }),
  tile: warrensBossTileStubSchema,
});

export const warrensVvulfHigherContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-vvulf-higher-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  sources: warrensVvulfIContentSchema.shape.sources,
  cards: z
    .array(
      z.strictObject({
        level: z.union([z.literal(2), z.literal(3)]),
        faces: z.tuple([vvulfFaceSchema]),
        abilities: z.strictObject({
          descriptionCardId: z.enum(["boss_ability:warrens:p002", "boss_ability:warrens:p003"]),
          combatCardId: z.enum(["boss_ability:warrens:p005", "boss_ability:warrens:p006"]),
          barrelOBombs: z.strictObject({
            removeAndDamage: z.union([z.literal(15), z.literal(20)]),
          }),
          reinforcements: z.strictObject({
            fusilierCard: z.enum(["Brigand Cutthroat", "Brigand Raider"]),
            listedInAbility: z.literal(true),
          }),
          threats: z.strictObject({
            dungeon: z.strictObject({
              name: z.string(),
              summary: z.string().optional(),
              recordedOnly: z.literal(true).optional(),
            }),
            hamlet: z.strictObject({
              name: z.string(),
              summary: z.string().optional(),
              recordedOnly: z.literal(true).optional(),
            }),
          }),
        }),
      }),
    )
    .length(2),
});

export type WarrensVvulfIContent = z.infer<typeof warrensVvulfIContentSchema>;
export type WarrensVvulfHigherContent = z.infer<typeof warrensVvulfHigherContentSchema>;
