import { z } from "zod";
import { wealdHagCombatFaceSchema, wealdHagContentSchema } from "./weald-hag";

const face = wealdHagCombatFaceSchema.extend({
  level: z.union([z.literal(2), z.literal(3)]),
  rawId: z.enum([
    "monster_large:weald:p011",
    "monster_large:weald:p012",
    "monster_large:weald:p014",
    "monster_large:weald:p015",
  ]),
});

/** R-267：独立印刷目录；不授予高等级战斗／房间或 Stygian 资格。 */
export const wealdHagHigherContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-hag-higher-v1"),
    ruling: z.literal("R-267"),
    combatReady: z.literal(false),
    sources: wealdHagContentSchema.shape.sources,
    cards: z
      .array(
        z.strictObject({
          level: z.union([z.literal(2), z.literal(3)]),
          faces: z.array(face).length(3),
          abilities: z.strictObject({
            descriptionCardId: z.string(),
            hagCardId: z.string(),
            cauldronCardId: z.string(),
            hagActionsPerRound: z.literal(2),
            cauldronActionsPerRound: z.literal(1),
            captiveTargetable: z.literal(false),
            lifecycleRulings: z.tuple([z.literal("R-255"), z.literal("R-256")]),
            threats: z.strictObject({
              dungeon: z.strictObject({
                name: z.string(),
                provisions: z.array(z.enum(["potion", "food", "bandage"])),
                stressPerUse: z.literal(1),
              }),
              hamlet: z.strictObject({
                name: z.string(),
                sanitariumHealingReduction: z.union([z.literal(6), z.literal(9)]),
              }),
            }),
          }),
        }),
      )
      .length(2),
  })
  .superRefine((content, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (content.cards.map((c) => c.level).join() !== "2,3") fail("高等级目录必须各含 II／III 一组");
    for (const card of content.cards) {
      const { level, abilities } = card;
      const roman = level === 2 ? "II" : "III";
      const expected = [
        ["hag", `monster_large:weald:p${level === 2 ? "011" : "012"}`, "front"],
        ["empty", `monster_large:weald:p${level === 2 ? "014" : "015"}`, "front"],
        ["full", `monster_large:weald:p${level === 2 ? "014" : "015"}`, "back"],
      ];
      if (
        JSON.stringify(card.faces.map((f) => [f.role, f.rawId, f.face])) !==
          JSON.stringify(expected) ||
        card.faces.some((f) => f.level !== level)
      )
        fail("Hag／锅面身份或等级不匹配，Full 不增加实体");
      if (
        abilities.descriptionCardId !== `boss_ability:weald:p0${12 + level}` ||
        abilities.hagCardId !== `boss_ability:weald:p0${15 + level}` ||
        abilities.cauldronCardId !== `boss_ability:weald:p0${18 + level}`
      )
        fail("能力卡等级与印刷身份不匹配");
      const { dungeon, hamlet } = abilities.threats;
      if (
        dungeon.name !== `Painfully Soothing ${roman}` ||
        dungeon.provisions.join() !== (level === 2 ? "potion,food" : "potion,food,bandage") ||
        hamlet.name !== `No Rest for the Wicked ${roman}` ||
        hamlet.sanitariumHealingReduction !== (level === 2 ? 6 : 9)
      )
        fail("高等级威胁与 R-267 不匹配");
      for (const f of card.faces) {
        const slots = f.skills.map((s) => s.slot);
        if (slots.join() !== (f.role === "hag" ? "1,2,3" : f.role === "full" ? "1" : ""))
          fail("技能槽缺失或重复");
        const expectedSelection =
          f.role === "hag"
            ? [
                { min: 1, max: 6, slot: 2 },
                { min: 7, max: 10, slot: 3 },
              ]
            : [];
        if (JSON.stringify(f.allStancesSelection) !== JSON.stringify(expectedSelection))
          fail("Hag 选招表不完整，锅不印选招表");
      }
    }
  });

export type WealdHagHigherContent = z.infer<typeof wealdHagHigherContentSchema>;
