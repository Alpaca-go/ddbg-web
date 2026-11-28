import { z } from "zod";

export const WARRENS_STYGIAN_ROOM_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_63x88_rooms_Stygian_FRONT.pdf";
export const WARRENS_STYGIAN_ROOM_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_63x88_rooms_Stygian_BACK.pdf";

/** 九张 Warrens 普通非 Boss 房间；按印刷页 p1–p9 替换同名同编号卡（R-036 程序类推）。 */
export function warrensStygianRoomIdentity(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 9)
    throw new Error("Warrens Stygian 房间页码无效");
  return {
    location: "warrens" as const,
    number: page,
    replacesCardId: `room:warrens:${String(page).padStart(2, "0")}`,
  };
}

/** 印刷房号与名称；与普通房 room:warrens:01–09 对齐，本刀不依赖未合入的普通房 JSON。 */
export const warrensStygianReplacementTargets = [
  { number: 1, name: "Putrid Cellar" },
  { number: 2, name: "The Sewage" },
  { number: 3, name: "Infected Storage" },
  { number: 4, name: "Experiment Deposit" },
  { number: 5, name: "Dumped Shinies" },
  { number: 6, name: "Rusted Armory" },
  { number: 7, name: "Swinery" },
  { number: 8, name: "The Gutter" },
  { number: 9, name: "Foul Throne" },
] as const;

/** 逐页待确认项（Q-WARRENS-34 起）；运行时闸门未开前保留在 pendingReview。 */
export const warrensStygianPendingReview: Readonly<Partial<Record<number, readonly string[]>>> = {
  1: ["Q-WARRENS-34：Infectious Mucus「suffer +1」印刷图标语义（区别于规则书普通房仅弃补给）。"],
  2: ["Q-WARRENS-35：Toxic Sewage 跟随位移图标（怪物造成）与 2 blight 3t 图标核印。"],
  3: ["Q-WARRENS-36：Trash Search「suffer」空位图标含义。"],
  4: [
    "Q-WARRENS-37：Experiment Deposit 效果段印刷无效果名，仅星标图标 + 冒号起句；勿补造标题。",
    "Q-WARRENS-38：「gains … 2t」增益图标与回合语义。",
  ],
  5: [
    "Q-WARRENS-39：Putrid Sewerage 压力 / 地牢等级与 blight 3t 图标。",
    "Q-WARRENS-40：Shinies 抽饰品等级与 +20 金币图标。",
  ],
  6: ["Q-WARRENS-41：Infected Weaponry +3/地牢等级与 debuff 3t 图标。"],
  7: ["Q-WARRENS-42：Rotten Food Store 双增益 3t/2t 图标种类。"],
  8: ["Q-WARRENS-43：Blighted Water 跟随位移与 4 blight 2t；印刷为 Charactersentering（无空格）。"],
  9: [
    "Q-WARRENS-44：Sneak Attack 先攻 Hero/Monster 分支增益图标。",
    "Q-WARRENS-45：Corrupting Aura 负面怪癖与全图怪物 debuff 2t。",
  ],
};

const warrensStygianRoomCardSchema = z
  .strictObject({
    id: z.string().regex(/^stygian_room:warrens:\d{2}$/),
    name: z.string().min(1),
    copies: z.literal(1),
    location: z.literal("warrens"),
    number: z.int().min(1).max(9),
    replacesCardId: z.string().regex(/^room:warrens:\d{2}$/),
    printedLines: z.array(z.string()).min(1),
    reviewedEffect: z.null(),
    pendingReview: z.array(z.string()),
    source: z.strictObject({
      front: z.literal(WARRENS_STYGIAN_ROOM_FRONT),
      back: z.literal(WARRENS_STYGIAN_ROOM_BACK),
      page: z.int().min(1).max(9),
    }),
  })
  .superRefine((card, ctx) => {
    const expected = warrensStygianRoomIdentity(card.source.page);
    if (
      card.id !== `stygian_room:warrens:${String(card.source.page).padStart(2, "0")}` ||
      card.number !== expected.number ||
      card.replacesCardId !== expected.replacesCardId
    )
      ctx.addIssue({ code: "custom", message: "Warrens Stygian 房间身份或替换关系不符" });
    const target = warrensStygianReplacementTargets.find((t) => t.number === card.number);
    if (!target || target.name !== card.name)
      ctx.addIssue({ code: "custom", message: "Warrens Stygian 房间名称与印刷房号表不一致" });
    const expectedPending = warrensStygianPendingReview[card.source.page] ?? [];
    if (JSON.stringify(card.pendingReview) !== JSON.stringify(expectedPending))
      ctx.addIssue({ code: "custom", message: "Warrens Stygian 待确认项与页码表不一致" });
  });

export const warrensStygianRoomsSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-stygian-rooms-v1"),
    cards: z
      .array(warrensStygianRoomCardSchema)
      .length(9)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === 9, "九张 Stygian 房间不可重复"),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "必须包含 p1–p9 九张 Warrens Stygian 房间" });
  });

export type WarrensStygianRooms = z.infer<typeof warrensStygianRoomsSchema>;

/** 目录查询：按被替换的普通房间 id 返回 Stygian 卡副本；未启用 Warrens 包时不应加载本文件。 */
export function readWarrensStygianRoomReplacement(
  file: WarrensStygianRooms,
  standardCardId: string,
) {
  return warrensStygianRoomsSchema
    .parse(file)
    .cards.find((c) => c.replacesCardId === standardCardId);
}

export function validateWarrensStygianRoomNames(file: WarrensStygianRooms) {
  warrensStygianRoomsSchema.parse(file);
  for (const card of file.cards) {
    const target = warrensStygianReplacementTargets.find((t) => t.number === card.number);
    if (
      !target ||
      target.name !== card.name ||
      card.location !== "warrens" ||
      card.replacesCardId !== `room:warrens:${String(card.number).padStart(2, "0")}`
    )
      throw new Error(
        "Warrens Stygian 替换目标须为同名同地点编号的非 Boss 普通房间；不得替换核心或 Boss 房",
      );
  }
}
