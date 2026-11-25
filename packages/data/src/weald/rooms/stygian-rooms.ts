import { z } from "zod";
import { wealdRoomFileSchema } from "./room";

export const WEALD_STYGIAN_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_Stygian_FRONT.pdf";
export const WEALD_STYGIAN_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_Stygian_BACK.pdf";

/** 九张 Weald 普通非 Boss 房间；按印刷页 p1–p9 替换同名同编号卡（核心 R-036 程序类推，不新增裁定号）。 */
export function wealdStygianRoomIdentity(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 9)
    throw new Error("Weald Stygian 房间页码无效");
  return {
    location: "weald" as const,
    number: page,
    replacesCardId: `room:weald:${String(page).padStart(2, "0")}`,
  };
}

const effectWithRuntimeGate = <const K extends string, T extends z.ZodRawShape>(
  kind: K,
  shape: T,
) => z.strictObject({ kind: z.literal(kind), runtimeReady: z.literal(true), ...shape });

const wealdStygianReviewedEffectSchema = z.discriminatedUnion("kind", [
  effectWithRuntimeGate("toxicMushrooms", {
    blight: z.literal(1),
    duration: z.literal(3),
    standardDuration: z.literal(2),
  }),
  effectWithRuntimeGate("unprepared", {
    debuffDuration: z.literal(3),
    standardDebuffDuration: z.literal(2),
  }),
  effectWithRuntimeGate("precious", {
    buffDuration: z.literal(3),
    buffApplications: z.literal(2),
    standardBuffDuration: z.literal(2),
  }),
  effectWithRuntimeGate("poisonousRoots", {
    blight: z.literal(2),
    duration: z.literal(3),
    standardDuration: z.literal(2),
  }),
  effectWithRuntimeGate("abyssalPuff", {
    buffDuration: z.literal(2),
    buffApplications: z.literal(2),
    note: z.literal("两项独立增益 2t，非 2t→3t 加长"),
  }),
  effectWithRuntimeGate("clearing", {
    oursBuffDuration: z.literal(3),
    oursDebuffRemoved: z.literal(true),
    heroEndTurnStressRecover: z.literal(1),
    monsterEndTurnRemoveLootChest: z.literal(true),
    note: z.literal("Ours! 仅增益 3t；Clearing 与普通相同"),
  }),
]);

export type WealdStygianReviewedEffect = z.infer<typeof wealdStygianReviewedEffectSchema>;

/** 印刷正面已核对的结构化效果；无独立效果段的房间为 null。 */
export const wealdStygianReviewedEffects: Readonly<
  Partial<Record<number, WealdStygianReviewedEffect>>
> = {
  1: {
    kind: "toxicMushrooms",
    runtimeReady: true,
    blight: 1,
    duration: 3,
    standardDuration: 2,
  },
  2: {
    kind: "unprepared",
    runtimeReady: true,
    debuffDuration: 3,
    standardDebuffDuration: 2,
  },
  4: {
    kind: "precious",
    runtimeReady: true,
    buffDuration: 3,
    buffApplications: 2,
    standardBuffDuration: 2,
  },
  5: {
    kind: "poisonousRoots",
    runtimeReady: true,
    blight: 2,
    duration: 3,
    standardDuration: 2,
  },
  8: {
    kind: "abyssalPuff",
    runtimeReady: true,
    buffDuration: 2,
    buffApplications: 2,
    note: "两项独立增益 2t，非 2t→3t 加长",
  },
  9: {
    kind: "clearing",
    runtimeReady: true,
    oursBuffDuration: 3,
    oursDebuffRemoved: true,
    heroEndTurnStressRecover: 1,
    monsterEndTurnRemoveLootChest: true,
    note: "Ours! 仅增益 3t；Clearing 与普通相同",
  },
};

const wealdStygianRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^stygian_room:weald:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("weald"),
    number: z.int().min(1).max(9),
    replacesCardId: z.string().regex(/^room:weald:\d{2}$/),
    printedLines: z.array(z.string()).min(1),
    reviewedEffect: wealdStygianReviewedEffectSchema.nullable(),
    pendingReview: z.array(z.string()),
    source: z.strictObject({
      front: z.literal(WEALD_STYGIAN_ROOM_FRONT),
      back: z.literal(WEALD_STYGIAN_ROOM_BACK),
      page: z.int().min(1).max(9),
    }),
  })
  .superRefine((card, ctx) => {
    const expected = wealdStygianRoomIdentity(card.source.page);
    if (
      card.id !== `stygian_room:weald:${String(card.source.page).padStart(2, "0")}` ||
      card.number !== expected.number ||
      card.replacesCardId !== expected.replacesCardId
    )
      ctx.addIssue({ code: "custom", message: "Weald Stygian 房间身份或替换关系不符" });
    const expectedEffect = wealdStygianReviewedEffects[card.source.page] ?? null;
    const effectJson = card.reviewedEffect ? JSON.stringify(card.reviewedEffect) : null;
    const expectedJson = expectedEffect ? JSON.stringify(expectedEffect) : null;
    if (effectJson !== expectedJson)
      ctx.addIssue({ code: "custom", message: "Weald Stygian 核准效果与页码表不一致" });
  });

export const wealdStygianRoomsSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-stygian-rooms-v1"),
    cards: z
      .array(wealdStygianRoomCardSchema)
      .length(9)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Stygian 房间不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 p1–p9 九张 Weald Stygian 房间" });
  });

export type WealdStygianRooms = z.infer<typeof wealdStygianRoomsSchema>;

/** 目录查询：按被替换的普通房间 id 返回 Stygian 卡副本；未启用 Weald 包时不应加载本文件。 */
export function readWealdStygianRoomReplacement(file: WealdStygianRooms, standardCardId: string) {
  return wealdStygianRoomsSchema.parse(file).cards.find((c) => c.replacesCardId === standardCardId);
}

export function validateWealdStygianRoomNames(
  file: WealdStygianRooms,
  rooms: z.infer<typeof wealdRoomFileSchema>,
) {
  const standard = wealdRoomFileSchema.parse(rooms);
  for (const card of file.cards) {
    const target = standard.cards.find((c) => c.id === card.replacesCardId);
    if (
      !target ||
      target.boss ||
      target.name !== card.name ||
      target.location !== card.location ||
      target.number !== card.number
    )
      throw new Error(
        "Weald Stygian 替换目标须为同名同地点编号的非 Boss 普通房间；不得替换核心或 Boss 房",
      );
  }
}
