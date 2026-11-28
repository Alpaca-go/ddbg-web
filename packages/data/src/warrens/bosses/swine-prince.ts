import { z } from "zod";
import {
  WARRENS_BOSS_ABILITIES_BACK,
  WARRENS_BOSS_ABILITIES_FRONT,
  WARRENS_MONSTER_LARGE_BACK,
  WARRENS_MONSTER_LARGE_FRONT,
  WARRENS_MONSTER_MEDIUM_BACK,
  WARRENS_MONSTER_MEDIUM_FRONT,
} from "../print";
import { warrensBossTileStubSchema } from "../tiles/boss-tile";

const effectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("pendingIcon"), note: z.string().min(1) }),
  z.strictObject({ kind: z.literal("selfPush"), distance: z.int().positive() }),
]);

const skillSchema = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.string().min(1),
  range: z.int().nonnegative(),
  maxTargets: z.int().positive(),
  crit: z.int().nonnegative(),
  critDamage: z.int().nonnegative(),
  accuracy: z.int().nonnegative(),
  damage: z.int().nonnegative(),
  effects: z.array(effectSchema),
});

const princeFaceSchema = z.strictObject({
  role: z.literal("prince"),
  rawId: z.enum([
    "monster_large:warrens:p005",
    "monster_large:warrens:p006",
    "monster_large:warrens:p007",
  ]),
  face: z.literal("front"),
  name: z.literal("Swine Prince"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  types: z.tuple([z.literal("beast"), z.literal("large")]),
  stanceSlots: z.literal(2),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.int().nonnegative(),
  resistances: z.array(z.literal("stun")),
  immunities: z.array(z.literal("bleed")),
  skills: z.array(skillSchema).length(3),
  selection: z.array(z.strictObject({ min: z.int(), max: z.int(), slot: z.int() })).min(1),
});

const wilburFaceSchema = z.strictObject({
  role: z.literal("wilbur"),
  rawId: z.enum([
    "monster_medium:warrens:p020",
    "monster_medium:warrens:p021",
    "monster_medium:warrens:p022",
  ]),
  face: z.literal("front"),
  name: z.literal("Wilbur"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  types: z.tuple([z.literal("beast"), z.literal("small")]),
  stanceSlots: z.literal(1),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.int().nonnegative(),
  resistances: z.array(z.never()),
  immunities: z.array(z.never()),
  skills: z.array(skillSchema).length(2),
  selection: z.array(z.strictObject({ min: z.int(), max: z.int(), slot: z.int() })).length(2),
});

export const warrensSwinePrinceIContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-swine-prince-i-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  pendingReview: z.array(z.string()).min(1),
  sources: z.strictObject({
    combatFront: z.literal(WARRENS_MONSTER_LARGE_FRONT),
    combatBack: z.literal(WARRENS_MONSTER_LARGE_BACK),
    abilityFront: z.literal(WARRENS_BOSS_ABILITIES_FRONT),
    abilityBack: z.literal(WARRENS_BOSS_ABILITIES_BACK),
  }),
  faces: z.tuple([princeFaceSchema, wilburFaceSchema]),
  abilities: z.strictObject({
    descriptionCardId: z.literal("boss_ability:warrens:p007"),
    combatCardId: z.literal("boss_ability:warrens:p010"),
    actionsPerRound: z.literal(2),
    ruleSummaries: z.array(z.string()).min(1),
    threats: z.strictObject({
      dungeon: z.strictObject({
        name: z.literal("Uneasy Times I"),
        summary: z.string(),
        hamletEffect: z.literal("survivalistBlocked"),
      }),
      hamlet: z.strictObject({
        name: z.literal("Bestial Rage"),
        summary: z.string(),
        dungeonEffect: z.literal("beastMonsterDamageBonus"),
        amount: z.literal(2),
      }),
    }),
  }),
  setup: z.strictObject({
    rule: z.literal("Warrens W4"),
    princeStance: z.literal("aggressive"),
    wilburStance: z.literal("ranged"),
    wilburEngineStanceHold: z.literal("support"),
    monsterInitiativeCards: z.literal(2),
    heroInitiativeCards: z.literal(4),
  }),
  tile: warrensBossTileStubSchema,
});

export const warrensSwinePrinceHigherContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-swine-prince-higher-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  sources: warrensSwinePrinceIContentSchema.shape.sources,
  cards: z
    .array(
      z.strictObject({
        level: z.union([z.literal(2), z.literal(3)]),
        faces: z.tuple([princeFaceSchema, wilburFaceSchema]),
        abilities: z.strictObject({
          descriptionCardId: z.enum(["boss_ability:warrens:p008", "boss_ability:warrens:p009"]),
          combatCardId: z.enum(["boss_ability:warrens:p011", "boss_ability:warrens:p012"]),
          enragedDamage: z.union([z.literal(12), z.literal(18)]),
          threats: z.strictObject({
            dungeon: z.strictObject({
              name: z.enum(["Uneasy Times II", "Uneasy Times III"]),
              hamletEffect: z.literal("survivalistDebuff"),
              amount: z.union([z.literal(1), z.literal(2)]),
            }),
            hamlet: z.strictObject({
              name: z.string(),
              dungeonEffect: z.literal("beastMonsterDamageBonus"),
              amount: z.union([z.literal(4), z.literal(6)]),
            }),
          }),
        }),
        setup: warrensSwinePrinceIContentSchema.shape.setup,
      }),
    )
    .length(2),
});

export type WarrensSwinePrinceIContent = z.infer<typeof warrensSwinePrinceIContentSchema>;
export type WarrensSwinePrinceHigherContent = z.infer<typeof warrensSwinePrinceHigherContentSchema>;
