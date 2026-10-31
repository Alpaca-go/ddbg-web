import { z } from "zod";

export const darkestBossAbilitiesSchema = z
  .strictObject({
    schema: z.literal("ddbg-darkest-boss-abilities-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string().regex(/^boss_ability:p\d{3}$/),
          name: z.string().min(1),
          sourceFile: z.literal(
            "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf",
          ),
          sourcePage: z.int().positive(),
          actionsPerRound: z.union([z.int().positive(), z.literal("special")]),
          textLines: z.array(z.string()),
          combatReady: z.literal(false),
        }),
      )
      .length(9),
  })
  .superRefine((file, ctx) => {
    const pages = [26, 28, 30, 31, 33, 34, 35, 36, 37];
    if (
      file.cards.some(
        (c, i) =>
          c.sourcePage !== pages[i] ||
          c.id !== `boss_ability:p${String(c.sourcePage).padStart(3, "0")}`,
      )
    )
      ctx.addIssue({ code: "custom", message: "最暗能力卡页码或顺序不一致" });
  });

export type DarkestBossAbilities = z.infer<typeof darkestBossAbilitiesSchema>;

/** 供卡牌详情读取转录文字；不把图标占位符当作可执行效果。 */
export function readDarkestBossAbility(file: DarkestBossAbilities, id: string) {
  const card = darkestBossAbilitiesSchema.parse(file).cards.find((c) => c.id === id);
  return card ? structuredClone(card) : undefined;
}
