import { z } from "zod";

const PRINT_ROOT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/";
export const COVE_BOSS_ABILITIES_FRONT = `${PRINT_ROOT}DD_EN_COVE_CARDS_70_120_Boss_Abilities_FRONT.pdf`;
export const COVE_BOSS_ABILITIES_BACK = `${PRINT_ROOT}DD_EN_COVE_CARDS_70_120_Boss_Abilities_BACK.pdf`;

export const coveBossIdSchema = z.enum(["shambler", "siren", "drowned_crew"]);
export type CoveBossId = z.infer<typeof coveBossIdSchema>;

/** 印刷页 p001–p018：各 Boss 描述 I–III 与能力 I–III。 */
export const coveBossAbilityManifest = [
  [1, "shambler", "Shambler", 1, "description"],
  [2, "shambler", "Shambler", 2, "description"],
  [3, "shambler", "Shambler", 3, "description"],
  [4, "shambler", "Shambler", 1, "combat", 1],
  [5, "shambler", "Shambler", 2, "combat", 1],
  [6, "shambler", "Shambler", 3, "combat", 1],
  [7, "siren", "Siren", 1, "description"],
  [8, "siren", "Siren", 2, "description"],
  [9, "siren", "Siren", 3, "description"],
  [10, "siren", "Siren", 1, "combat", 2],
  [11, "siren", "Siren", 2, "combat", 2],
  [12, "siren", "Siren", 3, "combat", 2],
  [13, "drowned_crew", "Drowned Crew", 1, "description"],
  [14, "drowned_crew", "Drowned Crew", 2, "description"],
  [15, "drowned_crew", "Drowned Crew", 3, "description"],
  [16, "drowned_crew", "Drowned Crew", 1, "combat", 2],
  [17, "drowned_crew", "Drowned Crew", 2, "combat", 2],
  [18, "drowned_crew", "Drowned Crew", 3, "combat", 2],
] as const;

const faceTextSchema = z.strictObject({
  sourceFile: z.string().min(1),
  textLines: z.array(z.string()),
});

export const coveBossAbilitiesSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-boss-abilities-v1"),
    textOnly: z.literal(true),
    cards: z
      .array(
        z.strictObject({
          id: z.string().regex(/^boss_ability:cove:p\d{3}$/),
          bossId: coveBossIdSchema,
          name: z.string().min(1),
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
          cardRole: z.enum(["description", "combat"]),
          actionsPerRound: z.union([z.int().positive(), z.null()]),
          sourcePage: z.int().positive(),
          boss: z.literal(true),
          poolEligible: z.literal(false),
          combatReady: z.literal(false),
          front: faceTextSchema,
          back: faceTextSchema,
        }),
      )
      .length(18),
  })
  .superRefine((file, ctx) => {
    for (const [i, row] of coveBossAbilityManifest.entries()) {
      const [page, bossId, name, level, cardRole, actionsMaybe] = row as
        | readonly [number, CoveBossId, string, 1 | 2 | 3, "description"]
        | readonly [number, CoveBossId, string, 1 | 2 | 3, "combat", number];
      const c = file.cards[i];
      const actionsPerRound = cardRole === "combat" ? (actionsMaybe as number | undefined) : null;
      if (
        !c ||
        c.id !== `boss_ability:cove:p${String(page).padStart(3, "0")}` ||
        c.sourcePage !== page ||
        c.bossId !== bossId ||
        c.name !== name ||
        c.level !== level ||
        c.cardRole !== cardRole ||
        c.actionsPerRound !== (actionsPerRound ?? null)
      )
        ctx.addIssue({
          code: "custom",
          message: `Cove 能力卡身份不符：p${String(page).padStart(3, "0")}`,
        });
    }
  });

export type CoveBossAbilities = z.infer<typeof coveBossAbilitiesSchema>;

export function readCoveBossAbility(file: CoveBossAbilities, id: string) {
  return coveBossAbilitiesSchema.parse(file).cards.find((card) => card.id === id);
}
