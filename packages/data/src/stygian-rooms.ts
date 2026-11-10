import { z } from "zod";
import { roomFileSchema } from "./room";

export const STYGIAN_ROOM_FRONT =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_FRONT.pdf";
export const STYGIAN_ROOM_BACK =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_Stygian_BACK.pdf";

/** R-036：九张遗迹、八张最暗非Boss房间；不推断印刷几何。 */
export function stygianRoomIdentity(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 17) throw new Error("Stygian房间页码无效");
  return {
    location: page <= 9 ? ("ruins" as const) : ("darkestDungeon" as const),
    number: page <= 9 ? page : page - 9,
    replacesCardId: `room:p${String(page <= 9 ? page : page + 4).padStart(3, "0")}`,
  };
}

const reviewedEffectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("cornered"), stress: z.literal(2) }),
  z.strictObject({
    kind: z.literal("healingWaters"),
    healPerHeroLevel: z.literal(3),
    stress: z.literal(1),
  }),
  z.strictObject({
    kind: z.literal("spikedPit"),
    monsterHealPerDungeonLevel: z.literal(4),
    heroesOnly: z.literal(true),
  }),
  z.strictObject({ kind: z.literal("beaconOfLight"), darknessStress: z.literal(2) }),
  z.strictObject({
    kind: z.literal("treasureChamber"),
    lootStress: z.literal(1),
    hideStress: z.literal(3),
  }),
  z.strictObject({ kind: z.literal("ancestorGlory") }),
  z.strictObject({ kind: z.literal("invokingAbyss"), stress: z.literal(4) }),
  z.strictObject({ kind: z.literal("feelingThePresence"), stressPerNegativeQuirk: z.literal(2) }),
  z.strictObject({ kind: z.literal("hallOfAscension"), stress: z.literal(5) }),
  z.strictObject({ kind: z.literal("eldritchVault") }),
  z.strictObject({ kind: z.literal("toxicVapors"), blight: z.literal(1), duration: z.literal(3) }),
  z.strictObject({ kind: z.literal("eldritchPower"), damage: z.literal(10) }),
  z.strictObject({ kind: z.literal("teleporters"), stress: z.literal(2) }),
  z.strictObject({
    kind: z.literal("riteOfTheChosen"),
    stress: z.literal(2),
    woundsPerNegativeQuirk: z.literal(5),
  }),
  z.strictObject({
    kind: z.literal("unholyAura"),
    healingForbidden: z.literal(true),
    endTurnWoundsPerHeroLevel: z.literal(1),
  }),
  z.strictObject({
    kind: z.literal("poolOfRebirth"),
    endTurnStressPerNegativeQuirk: z.literal(2),
    endTurnHealPerNegativeQuirk: z.literal(3),
    reviveStressPerHero: z.literal(4),
  }),
  z.strictObject({
    kind: z.literal("evilEye"),
    diseaseAfterNegativeQuirk: z.literal(true),
    staringEyesStress: z.literal(3),
  }),
]);

/** R-036 与 R-227～R-229，按 Stygian 房间卡印刷页。 */
export const stygianReviewedEffects: Readonly<
  Partial<Record<number, z.infer<typeof reviewedEffectSchema>>>
> = {
  1: { kind: "cornered", stress: 2 },
  2: { kind: "unholyAura", healingForbidden: true, endTurnWoundsPerHeroLevel: 1 },
  3: { kind: "healingWaters", healPerHeroLevel: 3, stress: 1 },
  4: { kind: "spikedPit", monsterHealPerDungeonLevel: 4, heroesOnly: true },
  5: { kind: "beaconOfLight", darknessStress: 2 },
  6: { kind: "treasureChamber", lootStress: 1, hideStress: 3 },
  7: { kind: "ancestorGlory" },
  8: { kind: "invokingAbyss", stress: 4 },
  9: { kind: "feelingThePresence", stressPerNegativeQuirk: 2 },
  10: {
    kind: "poolOfRebirth",
    endTurnStressPerNegativeQuirk: 2,
    endTurnHealPerNegativeQuirk: 3,
    reviveStressPerHero: 4,
  },
  11: { kind: "hallOfAscension", stress: 5 },
  12: { kind: "eldritchVault" },
  13: { kind: "toxicVapors", blight: 1, duration: 3 },
  14: { kind: "eldritchPower", damage: 10 },
  15: { kind: "teleporters", stress: 2 },
  16: { kind: "evilEye", diseaseAfterNegativeQuirk: true, staringEyesStress: 3 },
  17: { kind: "riteOfTheChosen", stress: 2, woundsPerNegativeQuirk: 5 },
};
export const stygianRoomsSchema = z
  .strictObject({
    schema: z.literal("ddbg-stygian-rooms-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string(),
          name: z.string().min(1),
          copies: z.literal(1),
          location: z.enum(["ruins", "darkestDungeon"]),
          number: z.int().positive(),
          replacesCardId: z.string(),
          printedLines: z.array(z.string()).min(1),
          reviewedEffect: reviewedEffectSchema,
          source: z.strictObject({
            front: z.literal(STYGIAN_ROOM_FRONT),
            back: z.literal(STYGIAN_ROOM_BACK),
            page: z.int().min(1).max(17),
          }),
        }),
      )
      .length(17),
  })
  .superRefine((file, ctx) => {
    for (const [i, c] of file.cards.entries()) {
      if (i >= 17) continue;
      const page = i + 1,
        identity = stygianRoomIdentity(page);
      const expectedEffect = stygianReviewedEffects[page]?.kind;
      if (
        c.id !== `stygian_room:p${String(page).padStart(3, "0")}` ||
        c.source.page !== page ||
        c.location !== identity.location ||
        c.number !== identity.number ||
        c.replacesCardId !== identity.replacesCardId ||
        c.reviewedEffect.kind !== expectedEffect
      )
        ctx.addIssue({ code: "custom", message: "Stygian房间身份或替换关系不符" });
    }
  });
export type StygianRooms = z.infer<typeof stygianRoomsSchema>;

/** 只提供R-036的替换卡查询；八张Boss卡没有替换项。 */
export function readStygianRoomReplacement(file: StygianRooms, standardCardId: string) {
  return stygianRoomsSchema.parse(file).cards.find((c) => c.replacesCardId === standardCardId);
}

export function validateStygianRoomNames(
  file: StygianRooms,
  rooms: z.infer<typeof roomFileSchema>,
) {
  const standard = roomFileSchema.parse(rooms);
  for (const card of file.cards) {
    const target = standard.cards.find((c) => c.id === card.replacesCardId);
    if (
      !target ||
      target.boss ||
      target.name !== card.name ||
      target.location !== card.location ||
      target.number !== card.number
    )
      throw new Error("Stygian替换目标须为同名同地点编号的非Boss房间（R-036）");
  }
}
