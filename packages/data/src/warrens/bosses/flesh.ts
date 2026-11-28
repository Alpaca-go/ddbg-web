import { z } from "zod";
import {
  WARRENS_BOSS_ABILITIES_BACK,
  WARRENS_BOSS_ABILITIES_FRONT,
  WARRENS_MONSTER_MEDIUM_BACK,
  WARRENS_MONSTER_MEDIUM_FRONT,
} from "../print";
import { warrensBossTileStubSchema } from "../tiles/boss-tile";

const pendingIcon = z.strictObject({ kind: z.literal("pendingIcon"), note: z.string().min(1) });

const fleshSkillSchema = z.strictObject({
  slot: z.literal(1),
  name: z.string().min(1),
  target: z.string().min(1),
  range: z.int().nonnegative(),
  maxTargets: z.int().positive(),
  crit: z.int().nonnegative(),
  critDamage: z.int().nonnegative(),
  accuracy: z.int().nonnegative(),
  damage: z.int().nonnegative(),
  effects: z.array(pendingIcon).max(1),
});

const fleshPartSchema = z.strictObject({
  role: z.enum(["head", "bone", "heart", "butt"]),
  rawId: z.string().regex(/^monster_medium:warrens:p0(2[3-9]|3[0-4])$/),
  face: z.literal("front"),
  name: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  types: z.tuple([z.literal("eldritch")]),
  stanceSlots: z.literal(1),
  sharedLife: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.literal(0),
  resistances: z.array(z.never()),
  immunities: z.array(z.never()),
  skills: z.array(fleshSkillSchema).length(1),
  selection: z.array(z.strictObject({ min: z.literal(1), max: z.literal(10), slot: z.literal(1) })),
});

export const warrensFleshIContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-flesh-i-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  pendingReview: z.array(z.string()).min(1),
  sources: z.strictObject({
    combatFront: z.literal(WARRENS_MONSTER_MEDIUM_FRONT),
    combatBack: z.literal(WARRENS_MONSTER_MEDIUM_BACK),
    abilityFront: z.literal(WARRENS_BOSS_ABILITIES_FRONT),
    abilityBack: z.literal(WARRENS_BOSS_ABILITIES_BACK),
  }),
  oneBodySharedLife: z.literal(93),
  faces: z.array(fleshPartSchema).length(4),
  abilities: z.strictObject({
    descriptionCardId: z.literal("boss_ability:warrens:p013"),
    combatCardId: z.literal("boss_ability:warrens:p016"),
    actionsPerRound: z.literal(4),
    ruleSummaries: z.array(z.string()).min(1),
    threats: z.strictObject({
      dungeon: z.strictObject({
        name: z.literal("Big Troubles I"),
        summary: z.string(),
        runtimeNote: z.literal("recordedOnly"),
      }),
      hamlet: z.strictObject({
        name: z.literal("Creeping Sickness I"),
        summary: z.string(),
        runtimeNote: z.literal("recordedOnly"),
      }),
    }),
    dungeonThreatHigher: z.strictObject({
      II: z.strictObject({
        name: z.literal("Bigger Troubles II"),
        drawUntilLargeMonster: z.literal(true),
        implementDraw: z.literal(false),
      }),
      III: z.strictObject({
        name: z.literal("Bigger Troubles III"),
        drawUntilLargeMonster: z.literal(true),
        implementDraw: z.literal(false),
      }),
    }),
  }),
  setup: z.strictObject({
    rule: z.literal("Warrens W4"),
    partStances: z.strictObject({
      head: z.literal("aggressive"),
      bone: z.literal("defensive"),
      heart: z.literal("ranged"),
      butt: z.literal("support"),
    }),
    monsterInitiativeCards: z.literal(4),
    heroInitiativeCards: z.literal(4),
  }),
  tile: warrensBossTileStubSchema,
});

export const warrensFleshHigherContentSchema = z.strictObject({
  schema: z.literal("ddbg-warrens-flesh-higher-v0"),
  combatReady: z.literal(false),
  runtimeReady: z.literal(false),
  sources: warrensFleshIContentSchema.shape.sources,
  cards: z
    .array(
      z.strictObject({
        level: z.union([z.literal(2), z.literal(3)]),
        sharedLife: z.union([z.literal(123), z.literal(155)]),
        faces: z.array(fleshPartSchema).length(4),
        abilities: z.strictObject({
          descriptionCardId: z.enum(["boss_ability:warrens:p014", "boss_ability:warrens:p015"]),
          combatCardId: z.enum(["boss_ability:warrens:p017", "boss_ability:warrens:p018"]),
          threats: z.strictObject({
            dungeon: z.strictObject({
              name: z.enum(["Bigger Troubles II", "Bigger Troubles III"]),
              drawUntilLargeMonster: z.literal(true),
              implementDraw: z.literal(false),
            }),
            hamlet: z.strictObject({
              name: z.enum(["Creeping Sickness II", "Creeping Sickness III"]),
              summary: z.string(),
            }),
          }),
        }),
      }),
    )
    .length(2),
});

export type WarrensFleshIContent = z.infer<typeof warrensFleshIContentSchema>;
export type WarrensFleshHigherContent = z.infer<typeof warrensFleshHigherContentSchema>;
