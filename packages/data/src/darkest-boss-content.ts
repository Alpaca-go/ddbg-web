import { z } from "zod";

export const finalFormIdSchema = z.enum([
  "ancestor1",
  "ancestor2",
  "gestatingHeart",
  "heartOfDarkness",
]);
export const darkestQuestIdSchema = z.enum(["quest:p016", "quest:p017", "quest:p018"]);
const actor = z.strictObject({
  cardId: z.string(),
  abilityCardId: z.string(),
  stance: z.enum(["aggressive", "ranged"]),
  initiativeCards: z.int().positive(),
  actionsPerRound: z.union([z.int().positive(), z.literal("special")]),
});
export const darkestBossContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-darkest-boss-content-v1"),
    source: z.strictObject({
      abilities: z.literal(
        "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf",
      ),
      quests: z.literal("02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf"),
    }),
    encounters: z
      .array(
        z.strictObject({
          questId: darkestQuestIdSchema,
          roomCardId: z.string(),
          actors: z.array(actor).min(1),
          supportCardIds: z.array(z.string()),
          supportAbilityCardIds: z.array(z.string()),
          skipFinalForm: finalFormIdSchema,
          combatReady: z.literal(false),
        }),
      )
      .length(3),
    finalBattle: z.strictObject({
      roomCardId: z.literal("room:p025"),
      preparationDays: z.literal(4),
      drawHamletEvent: z.literal(false),
      exploration: z.literal(false),
      rollProvisions: z.literal(true),
      forms: z
        .array(
          z.strictObject({
            id: finalFormIdSchema,
            actor,
            supportCardIds: z.array(z.string()),
            combatReady: z.literal(false),
          }),
        )
        .length(4),
    }),
  })
  .superRefine((file, ctx) => {
    const signatures: Record<string, readonly unknown[]> = {
      "monster_large:p017": ["boss_ability:p033", "aggressive", 2, 2],
      "monster_large:p015": ["boss_ability:p028", "aggressive", 2, 2],
      "monster_large:p014": ["boss_ability:p026", "ranged", 2, 2],
      "monster_large:p016": ["boss_ability:p030", "aggressive", 2, 2],
      "monster_medium:p105": ["boss_ability:p034", "aggressive", 4, "special"],
      "monster_large:p018": ["boss_ability:p035", "aggressive", 2, 2],
      "monster_large:p019": ["boss_ability:p036", "aggressive", 1, 1],
      "monster_large:p020": ["boss_ability:p037", "aggressive", 2, 2],
    };
    for (const a of [
      ...file.encounters.flatMap((e) => e.actors),
      ...file.finalBattle.forms.map((f) => f.actor),
    ]) {
      if (
        JSON.stringify([a.abilityCardId, a.stance, a.initiativeCards, a.actionsPerRound]) !==
        JSON.stringify(signatures[a.cardId])
      )
        ctx.addIssue({ code: "custom", message: `Boss能力卡/姿态/先攻/行动数漂移：${a.cardId}` });
    }
    const expected = [
      ["quest:p016", "room:p023", "ancestor2", "monster_large:p017"],
      ["quest:p017", "room:p022", "ancestor1", "monster_large:p015", "monster_large:p014"],
      ["quest:p018", "room:p024", "gestatingHeart", "monster_large:p016"],
    ];
    expected.forEach(([quest, room, skip, ...ids]) => {
      const rows = file.encounters.filter((e) => e.questId === quest),
        e = rows[0];
      if (
        rows.length !== 1 ||
        !e ||
        e.roomCardId !== room ||
        e.skipFinalForm !== skip ||
        JSON.stringify(e.actors.map((a) => a.cardId)) !== JSON.stringify(ids)
      )
        ctx.addIssue({ code: "custom", message: `最暗任务/Boss/跳过形态不一致：${quest}` });
      const support =
        quest === "quest:p016"
          ? ["monster_medium:p072", "monster_medium:p075"]
          : quest === "quest:p018"
            ? ["monster_medium:p104"]
            : [];
      if (
        e &&
        (JSON.stringify(e.supportCardIds) !== JSON.stringify(support) ||
          JSON.stringify(e.supportAbilityCardIds) !==
            JSON.stringify(quest === "quest:p018" ? ["boss_ability:p031"] : []))
      )
        ctx.addIssue({ code: "custom", message: "最暗召唤物引用不一致" });
    });
    if (
      file.finalBattle.forms.map((f) => f.id).join(",") !==
      "ancestor1,ancestor2,gestatingHeart,heartOfDarkness"
    )
      ctx.addIssue({ code: "custom", message: "最终战形态顺序无效（R36）" });
    const formCards = [
      "monster_medium:p105",
      "monster_large:p018",
      "monster_large:p019",
      "monster_large:p020",
    ];
    if (file.finalBattle.forms.some((f, i) => f.actor.cardId !== formCards[i]))
      ctx.addIssue({ code: "custom", message: "最终形态与战斗卡不一致" });
    if (
      file.finalBattle.forms.some(
        (f, i) =>
          JSON.stringify(f.supportCardIds) !==
          JSON.stringify(i === 0 ? ["monster_medium:p106", "monster_medium:p109"] : []),
      )
    )
      ctx.addIssue({ code: "custom", message: "Reflections 引用不一致" });
  });
export type DarkestBossContent = z.infer<typeof darkestBossContentSchema>;

/** R36：取消前三形态之一，其余保持顺序，Heart of Darkness 永远保留。 */
export function finalBattlePlanForQuest(content: DarkestBossContent, questId: string) {
  const valid = darkestBossContentSchema.parse(content);
  const encounter = valid.encounters.find((e) => e.questId === questId);
  if (!encounter) throw new Error("最终战须有已完成的最暗任务身份（R36）");
  return {
    ...valid.finalBattle,
    skippedForm: encounter.skipFinalForm,
    forms: valid.finalBattle.forms.filter((f) => f.id !== encounter.skipFinalForm),
  };
}
