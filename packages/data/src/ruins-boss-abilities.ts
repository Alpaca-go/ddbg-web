import { z } from "zod";

export const ruinsBossAbilityManifest = [
  [4, "necromancer", "Necromancer", 1, 1],
  [5, "necromancer", "Necromancer", 2, 1],
  [6, "necromancer", "Necromancer", 3, 1],
  [10, "prophet", "Prophet", 1, 3],
  [11, "prophet", "Prophet", 2, 3],
  [12, "prophet", "Prophet", 3, 3],
  [16, "collector", "Collector", 1, 1],
  [17, "collector", "Collector", 2, 1],
  [18, "collector", "Collector", 3, 1],
  [22, "fanatic", "Fanatic", 1, 3],
  [23, "fanatic", "Fanatic", 2, 3],
  [24, "fanatic", "Fanatic", 3, 3],
] as const;

const sourcePrefix = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_";
export const ruinsBossAbilitiesSchema = z
  .strictObject({
    schema: z.literal("ddbg-ruins-boss-abilities-v1"),
    textOnly: z.literal(true),
    cards: z
      .array(
        z.strictObject({
          id: z.string(),
          bossId: z.enum(["necromancer", "prophet", "collector", "fanatic"]),
          name: z.string(),
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
          actionsPerRound: z.int().positive(),
          sourcePage: z.int().positive(),
          front: z.strictObject({
            sourceFile: z.literal(`${sourcePrefix}FRONT.pdf`),
            textLines: z.array(z.string()).min(1),
          }),
          back: z.strictObject({
            sourceFile: z.literal(`${sourcePrefix}BACK.pdf`),
            textLines: z.array(z.string()).min(1),
          }),
        }),
      )
      .length(12),
  })
  .superRefine((file, ctx) => {
    for (const [i, [page, boss, name, level, actions]] of ruinsBossAbilityManifest.entries()) {
      const c = file.cards[i]!;
      if (
        !c ||
        c.id !== `boss_ability:p${String(page).padStart(3, "0")}` ||
        c.sourcePage !== page ||
        c.bossId !== boss ||
        c.name !== name ||
        c.level !== level ||
        c.actionsPerRound !== actions
      )
        ctx.addIssue({ code: "custom", message: "遗迹能力卡身份/等级/行动数不符" });
    }
  });
export type RuinsBossAbilities = z.infer<typeof ruinsBossAbilitiesSchema>;

/** 文字目录与战斗注册表独立；读卡不会启用任何规则。 */
export function readRuinsBossAbility(file: RuinsBossAbilities, bossId: string, level: number) {
  return ruinsBossAbilitiesSchema
    .parse(file)
    .cards.find((c) => c.bossId === bossId && c.level === level);
}
