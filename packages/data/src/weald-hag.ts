import { z } from "zod";
import { wealdRoomTileBaseSchema, WEALD_TILES_BACK } from "./weald-room";

const PRINT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/";
const status = z.enum(["bleed", "blight", "stun", "debuff", "shuffle"]);
const skill = z.strictObject({
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.enum(["closest", "crowded", "furthest"]),
  range: z.int().nonnegative(),
  maxTargets: z.int().positive(),
  crit: z.int().nonnegative().nullable(),
  critDamage: z.int().nonnegative().nullable(),
  accuracy: z.int().nonnegative(),
  damage: z.int().nonnegative().nullable(),
  effects: z.array(
    z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("selfPull"), distance: z.int().positive() }),
      z.strictObject({ kind: z.literal("putInCauldron") }),
      z.strictObject({ kind: z.literal("debuff"), duration: z.int().positive() }),
      z.strictObject({ kind: z.literal("stress"), amount: z.int().positive() }),
    ]),
  ),
});
const combatFace = z.strictObject({
  role: z.enum(["hag", "empty", "full"]),
  rawId: z.enum(["monster_large:weald:p010", "monster_large:weald:p013"]),
  face: z.enum(["front", "back"]),
  name: z.string().min(1),
  level: z.literal(1),
  types: z.array(z.enum(["human", "large"])).min(1),
  stanceSlots: z.literal(2),
  life: z.int().positive(),
  speed: z.int().nonnegative(),
  dodge: z.int().nonnegative(),
  innateProtection: z.boolean(),
  resistances: z.array(status),
  immunities: z.array(status),
  skills: z.array(skill),
  // 同一选招表适用于 A/D/R/S；空锅无普通选招。
  allStancesSelection: z.array(
    z.strictObject({
      min: z.int().min(1).max(10),
      max: z.int().min(1).max(10),
      slot: z.int().min(1).max(3),
    }),
  ),
});

/** 独立 Boss 几何复用区域／引用校验，不扩大普通九房目录。 */
export const wealdHagTileSchema = wealdRoomTileBaseSchema
  .safeExtend({
    id: z.literal("room_tile:weald:p005:back"),
    rawId: z.literal("dungeon_tile:weald:p005"),
    roomId: z.literal("room:weald:p010"),
    number: z.literal(10),
    ruling: z.literal("R-254"),
    geometryVerified: z.literal(true),
    geometryComplete: z.literal(true),
    source: z.strictObject({
      file: z.literal(WEALD_TILES_BACK),
      page: z.literal(5),
      face: z.literal("back"),
    }),
  })
  .superRefine((tile, ctx) => {
    const pairs = tile.edges.map((edge) => [edge.from, edge.to].sort().join("-"));
    if (new Set(pairs).size !== pairs.length)
      ctx.addIssue({ code: "custom", message: "Hag 板块区域对不可重复或反向重复" });
    if (
      tile.areas.length !== 11 ||
      tile.areas.some((a) => a.elevation !== "normal" || a.capacity === 0)
    )
      ctx.addIssue({ code: "custom", message: "R-254：10 号 11 区均为普通地形，无零容量区" });
  });

/** R-254 印刷目录；卡面身份由 rawId + face 标识，尚不分配背面运行 ID。 */
export const wealdHagContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-hag-i-v1"),
    ruling: z.literal("R-254"),
    combatReady: z.literal(false),
    sources: z.strictObject({
      combatFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf`),
      combatBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_140x140_monster_large_BACK.pdf`),
      abilityFront: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf`),
      abilityBack: z.literal(`${PRINT}DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`),
    }),
    faces: z.array(combatFace).length(3),
    abilities: z.strictObject({
      descriptionCardId: z.literal("boss_ability:weald:p013"),
      hagCardId: z.literal("boss_ability:weald:p016"),
      cauldronCardId: z.literal("boss_ability:weald:p019"),
      hagActionsPerRound: z.literal(2),
      hagRuleSummaries: z.array(z.string().min(1)).min(1),
      cauldronRuleSummaries: z.array(z.string().min(1)).min(1),
      threats: z.strictObject({
        dungeon: z.strictObject({
          name: z.literal("Painfully Soothing I"),
          potionStress: z.literal(1),
        }),
        hamlet: z.strictObject({
          name: z.literal("No Rest for the Wicked I"),
          sanitariumHealingReduction: z.literal(3),
        }),
      }),
    }),
    setup: z.strictObject({
      rule: z.literal("Weald W4"),
      hagStance: z.literal("aggressive"),
      cauldronStance: z.literal("ranged"),
      monsterInitiativeCards: z.literal(3),
      heroInitiativeCards: z.literal(4),
      emptySkipsAction: z.literal(true),
      removeCauldronOnHagDefeat: z.literal(true),
    }),
    tile: wealdHagTileSchema,
  })
  .superRefine((content, ctx) => {
    const expected = [
      ["hag", "monster_large:weald:p010", "front"],
      ["empty", "monster_large:weald:p013", "front"],
      ["full", "monster_large:weald:p013", "back"],
    ];
    if (
      JSON.stringify(content.faces.map((f) => [f.role, f.rawId, f.face])) !==
      JSON.stringify(expected)
    )
      ctx.addIssue({ code: "custom", message: "Hag／锅卡面身份不符，Full 不增加组件" });
    for (const face of content.faces) {
      const slots = new Set(face.skills.map((s) => s.slot));
      if (
        slots.size !== face.skills.length ||
        face.allStancesSelection.some((s) => s.min > s.max || !slots.has(s.slot))
      )
        ctx.addIssue({ code: "custom", message: "选招引用未知／重复技能或区间倒置" });
    }
  });
export type WealdHagContent = z.infer<typeof wealdHagContentSchema>;
