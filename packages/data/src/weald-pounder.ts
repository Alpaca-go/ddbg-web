import { z } from "zod";
import { wealdRoomTileBaseSchema, WEALD_TILES_BACK } from "./weald-room";

const PRINT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/";
const status = z.enum(["stun", "bleed", "blight", "debuff", "shuffle"]);
export const wealdPounderCombatFaceSchema = z.strictObject({
  role: z.enum(["pounder", "matchman"]),
  rawId: z.enum(["monster_medium:weald:p020", "monster_medium:weald:p023"]),
  face: z.literal("front"),
  name: z.string().min(1),
  level: z.literal(1),
  types: z.array(z.literal("human")),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.int().nonnegative(),
  innateProtection: z.boolean(),
  resistances: z.array(status),
  immunities: z.array(status),
  selection: z.enum(["triggerOnly", "skill1AllStances"]),
  skill: z.discriminatedUnion("target", [
    z.strictObject({
      slot: z.literal(1),
      name: z.literal("BOOOOOOM!"),
      target: z.literal("crowded"),
      range: z.literal(5),
      minRange: z.literal(0),
      maxTargets: z.literal(4),
      crit: z.literal(0),
      critDamage: z.literal(19),
      accuracy: z.literal(9),
      damage: z.literal(9),
      onHitStress: z.literal(2),
    }),
    z.strictObject({
      slot: z.literal(1),
      name: z.literal("Fire in the Hole!"),
      target: z.literal("pounder"),
      range: z.literal(0),
      crit: z.null(),
      accuracy: z.null(),
      damage: z.null(),
      triggerSkill: z.literal("BOOOOOOM!"),
      requiresSameArea: z.literal(true),
    }),
  ]),
});

/** 仅扩展独立 Boss 身份；普通九房 schema 的范围保持不变。 */
export const wealdPounderTileSchema = wealdRoomTileBaseSchema
  .safeExtend({
    id: z.literal("room_tile:weald:12"),
    rawId: z.literal("dungeon_tile:weald:p006"),
    roomId: z.literal("room:weald:12"),
    number: z.literal(12),
    ruling: z.literal("R-258"),
    geometryVerified: z.literal(true),
    geometryComplete: z.literal(true),
    source: z.strictObject({
      file: z.literal(WEALD_TILES_BACK),
      page: z.literal(6),
      face: z.literal("back"),
    }),
  })
  .superRefine((tile, ctx) => {
    const pairs = tile.edges.map((edge) => [edge.from, edge.to].sort().join("-"));
    if (new Set(pairs).size !== pairs.length)
      ctx.addIssue({ code: "custom", message: "Pounder 区域对不可重复或反向重复" });
    if (
      tile.areas.length !== 12 ||
      tile.areas.some((a) => a.elevation !== "normal" || a.capacity === 0)
    )
      ctx.addIssue({ code: "custom", message: "R-258：12 号十二区无高低地或零容量区" });
  });

/** R-258／R-259 核准内容；不赋予 Boss 注册或 combatReady。 */
export const wealdPounderContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-pounder-i-v1"),
    rulings: z.tuple([z.literal("R-258"), z.literal("R-259")]),
    combatReady: z.literal(false),
    sources: z.strictObject({
      combatFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_monsters_medium_FRONT.pdf`),
      combatBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_monsters_medium_BACK.pdf`),
      abilityFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf`),
      abilityBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`),
    }),
    faces: z.tuple([wealdPounderCombatFaceSchema, wealdPounderCombatFaceSchema]),
    abilities: z.strictObject({
      descriptionCardId: z.literal("boss_ability:weald:p007"),
      combatCardId: z.literal("boss_ability:weald:p010"),
      actionsPerRound: z.literal(1),
      reinforcements: z.strictObject({
        condition: z.literal("matchmanAbsent"),
        mode: z.literal("fillToComposition"),
        matchmen: z.literal(1),
        fusiliers: z.literal(2),
        fusilierCardId: z.literal("monster_medium:p027"),
      }),
      threats: z.strictObject({
        dungeon: z.strictObject({
          name: z.literal("Bullseye Guillotine I"),
          trigger: z.literal("enterMonsterRangedStance"),
          buffDuration: z.literal(2),
          riposteDuration: z.literal(1),
        }),
        hamlet: z.strictObject({
          name: z.literal("Bombardment I"),
          timing: z.literal("dayEndBeforeHeroRemoval"),
          roll: z.literal("d10"),
          heroDamage: z.literal(5),
          emptyBuilding: z.literal("levelDownIfPossible"),
          caretaker: z.literal("preventsAllEffects"),
        }),
      }),
    }),
    setup: z.strictObject({
      rule: z.literal("Weald W4"),
      pounderStance: z.literal("aggressive"),
      monsterInitiativeCards: z.literal(1),
      heroInitiativeCards: z.literal(4),
      removeAllBrigandsOnPounderDefeat: z.literal(true),
    }),
    tile: wealdPounderTileSchema,
  })
  .superRefine(({ faces }, ctx) => {
    const expected = [
      ["pounder", "monster_medium:weald:p020", "triggerOnly", "crowded"],
      ["matchman", "monster_medium:weald:p023", "skill1AllStances", "pounder"],
    ];
    if (
      JSON.stringify(faces.map((f) => [f.role, f.rawId, f.selection, f.skill.target])) !==
      JSON.stringify(expected)
    )
      ctx.addIssue({ code: "custom", message: "Pounder／Matchman 身份或触发选招不符" });
  });
export type WealdPounderContent = z.infer<typeof wealdPounderContentSchema>;
