import { z } from "zod";
import { wealdRoomTileBaseSchema, WEALD_TILES_FRONT } from "../../rooms/weald-room";
const PRINT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/";
const status = z.enum(["stun", "bleed", "blight", "debuff", "shuffle"]);
const skill = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.enum(["closest", "crowded"]),
  range: z.int().nonnegative(),
  maxTargets: z.int().min(1).max(4),
  crit: z.int().nonnegative(),
  critDamage: z.int().nonnegative(),
  accuracy: z.int().nonnegative(),
  damage: z.int().nonnegative(),
  effects: z.array(
    z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.enum(["selfPush", "selfPull"]), distance: z.int().positive() }),
      z.strictObject({
        kind: z.literal("bleed"),
        amount: z.int().positive(),
        duration: z.int().positive(),
      }),
      z.strictObject({ kind: z.literal("stress"), amount: z.int().positive() }),
      z.strictObject({ kind: z.literal("debuff"), duration: z.int().positive() }),
      z.strictObject({ kind: z.literal("disease") }),
    ]),
  ),
});
export const wealdShriekerCombatFaceSchema = z.strictObject({
  role: z.enum(["shrieker", "nest"]),
  rawId: z.enum(["monster_large:weald:p004", "monster_large:weald:p007"]),
  face: z.literal("front"),
  name: z.string().min(1),
  level: z.literal(1),
  types: z.array(z.enum(["eldritch", "beast", "large"])),
  stanceSlots: z.literal(2),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.int().nonnegative(),
  resistances: z.array(status),
  immunities: z.array(status),
  selection: z.array(
    z.strictObject({
      min: z.int().min(1).max(10),
      max: z.int().min(1).max(10),
      slot: z.int().min(1).max(3),
    }),
  ),
  skills: z.array(skill),
});
/** 独立 Boss 面，不放宽普通九房目录。 */
export const wealdShriekerTileSchema = wealdRoomTileBaseSchema
  .safeExtend({
    id: z.literal("room_tile:weald:11"),
    rawId: z.literal("dungeon_tile:weald:p006"),
    roomId: z.literal("room:weald:11"),
    number: z.literal(11),
    ruling: z.literal("R-261"),
    geometryVerified: z.literal(true),
    geometryComplete: z.literal(true),
    source: z.strictObject({
      file: z.literal(WEALD_TILES_FRONT),
      page: z.literal(6),
      face: z.literal("front"),
    }),
  })
  .superRefine((tile, ctx) => {
    const capacities = [4, 4, 4, 3, 5, 3, 3, 4, 4, 2];
    if (
      tile.areas.length !== 10 ||
      tile.areas.some(
        (a, i) =>
          a.id !== "ABCDEFGHIJ"[i] ||
          a.capacity !== capacities[i] ||
          a.elevation !== "normal" ||
          a.zeroCapacity,
      )
    )
      ctx.addIssue({ code: "custom", message: "R-261 十区身份、容量或地形不符" });
    const pairs = tile.edges.map((e) => [e.from, e.to].sort().join(""));
    if (
      tile.edges.some((e) => e.blocked || e.cornerOnly) ||
      pairs.sort().join(" ") !== "AB AD BC BE CF DE DG EF EH FI GH GJ HI HJ"
    )
      ctx.addIssue({ code: "custom", message: "R-261 14 对共边不符或重复" });
    const h = tile.deployment.heroes,
      m = tile.deployment.monsters;
    if (
      [h.aggressive, h.defensive, h.ranged, h.support].join() !== "J,J,C,C" ||
      Object.values(m).some((a) => a !== "E") ||
      tile.deployment.lootAreas.join() !== "A,E,I" ||
      tile.necroticFungusAreas.length ||
      tile.zeroCapacityAreas.length ||
      tile.specialRegions.length
    )
      ctx.addIssue({ code: "custom", message: "R-261 部署、宝箱或区域机制不符" });
  });
/** R-261／R-262 核准 I 级数据与完整运行标记；旧命令准入仍由显式版本控制。 */
export const wealdShriekerContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-shrieker-i-v2"),
    rulings: z.tuple([z.literal("R-261"), z.literal("R-262")]),
    combatReady: z.literal(true),
    sources: z.strictObject({
      combatFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf`),
      combatBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_140x140_monster_large_BACK.pdf`),
      abilityFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf`),
      abilityBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`),
    }),
    faces: z.tuple([wealdShriekerCombatFaceSchema, wealdShriekerCombatFaceSchema]),
    abilities: z.strictObject({
      descriptionCardId: z.literal("boss_ability:weald:p001"),
      combatCardId: z.literal("boss_ability:weald:p004"),
      actionsPerRound: z.literal(3),
      nestAreaExclusiveToShrieker: z.literal(true),
      callTheMurder: z.strictObject({
        condition: z.literal("nestInPlay"),
        replaces: z.literal("selfPush2"),
        destination: z.literal("nestArea"),
        printedHeal: z.literal(2),
      }),
      threats: z.strictObject({
        dungeon: z.strictObject({
          name: z.literal("Where Did It Go? I"),
          trigger: z.literal("afterGainProvision"),
          discardCount: z.literal(1),
          choice: z.literal("player"),
        }),
        hamlet: z.strictObject({
          name: z.literal("Murder of Magpies I"),
          trigger: z.literal("afterAllHeroesRollSupplyDice"),
          discardCount: z.literal(1),
          choice: z.literal("player"),
        }),
      }),
    }),
    pendingRuleDetails: z.tuple([]),
    setup: z.strictObject({
      rule: z.literal("Weald W3"),
      shriekerStance: z.literal("aggressive"),
      nestStance: z.literal("ranged"),
      monsterInitiativeCards: z.literal(3),
      heroInitiativeCards: z.literal(4),
      removeNestOnShriekerDefeat: z.literal(true),
    }),
    tile: wealdShriekerTileSchema,
    nestArea: z.literal("E"),
  })
  .superRefine(({ faces: [boss, nest] }, ctx) => {
    if (
      boss.role !== "shrieker" ||
      boss.rawId !== "monster_large:weald:p004" ||
      boss.life !== 49 ||
      boss.speed !== 3 ||
      boss.dodge !== 2 ||
      boss.types.join() !== "eldritch,beast,large" ||
      boss.resistances.join() !== "stun,bleed,shuffle" ||
      boss.immunities.join() !== "blight"
    )
      ctx.addIssue({ code: "custom", message: "R-261 Shrieker 字段不符" });
    if (
      nest.role !== "nest" ||
      nest.rawId !== "monster_large:weald:p007" ||
      nest.life !== 20 ||
      nest.speed !== 0 ||
      nest.dodge !== 0 ||
      nest.types.join() !== "large" ||
      nest.resistances.length ||
      nest.immunities.join() !== "stun,bleed,blight,debuff,shuffle" ||
      nest.skills.length ||
      nest.selection.length
    )
      ctx.addIssue({ code: "custom", message: "R-261 Nest 字段或无技能边界不符" });
    if (
      JSON.stringify(boss.selection) !==
      JSON.stringify([
        { min: 1, max: 5, slot: 1 },
        { min: 6, max: 9, slot: 2 },
        { min: 10, max: 10, slot: 3 },
      ])
    )
      ctx.addIssue({ code: "custom", message: "R-261 选招不符" });
    if (
      boss.skills.length !== 3 ||
      boss.skills.some((s, i) => {
        const approved = [
          [1, "Peck", "closest", 1, 1, 2, 11, 9, 8],
          [2, "Call the Murder", "crowded", 1, 4, 1, 4, 10, 2],
          [3, "Regurgitate", "crowded", 2, 2, 1, 2, 9, 1],
        ][i];
        const effects = [
          [
            { kind: "selfPull", distance: 1 },
            { kind: "bleed", amount: 2, duration: 2 },
          ],
          [
            { kind: "selfPush", distance: 2 },
            { kind: "stress", amount: 1 },
          ],
          [{ kind: "debuff", duration: 2 }, { kind: "disease" }],
        ][i];
        return (
          JSON.stringify(s.effects) !== JSON.stringify(effects) ||
          JSON.stringify([
            s.slot,
            s.name,
            s.target,
            s.range,
            s.maxTargets,
            s.crit,
            s.critDamage,
            s.accuracy,
            s.damage,
          ]) !== JSON.stringify(approved)
        );
      })
    )
      ctx.addIssue({ code: "custom", message: "R-261 三技能字段不符" });
  });
export type WealdShriekerContent = z.infer<typeof wealdShriekerContentSchema>;
