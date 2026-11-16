import { z } from "zod";
import {
  wealdShriekerCombatFaceSchema as baseFace,
  wealdShriekerContentSchema as base,
} from "./weald-shrieker";
const level = z.union([z.literal(2), z.literal(3)]);
const face = baseFace.extend({
  level,
  rawId: z.enum([
    "monster_large:weald:p005",
    "monster_large:weald:p006",
    "monster_large:weald:p008",
    "monster_large:weald:p009",
  ]),
});
const abilities = base.shape.abilities.extend({
  descriptionCardId: z.enum(["boss_ability:weald:p002", "boss_ability:weald:p003"]),
  combatCardId: z.enum(["boss_ability:weald:p005", "boss_ability:weald:p006"]),
  callTheMurder: base.shape.abilities.shape.callTheMurder.extend({
    printedHeal: z.union([z.literal(3), z.literal(4)]),
  }),
  threats: z.strictObject({
    dungeon: z.discriminatedUnion("mode", [
      z.strictObject({ mode: z.literal("ignoreAfterRoll") }),
      z.strictObject({
        mode: z.literal("gainThenDiscard"),
        discardCount: z.literal(2),
        insufficient: z.literal("discardAll"),
      }),
    ]),
    hamlet: z.discriminatedUnion("mode", [
      z.strictObject({
        mode: z.literal("discardReserve"),
        discardCount: z.literal(3),
        insufficient: z.literal("discardAll"),
      }),
      z.strictObject({
        mode: z.literal("reduceNormalDice"),
        reductionPerHero: z.literal(1),
        preserveExtraDice: z.literal(true),
      }),
    ]),
  }),
});
/** R-268：按实际印刷等级收录，房间沿用核准 11 号；整批完成后逐项复核。 */
export const wealdShriekerHigherContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-shrieker-higher-v1"),
    ruling: z.literal("R-268"),
    combatReady: z.literal(false),
    sources: base.shape.sources,
    cards: z.array(z.strictObject({ level, faces: z.tuple([face, face]), abilities })).length(2),
  })
  .superRefine(({ cards }, ctx) => {
    const fail = () =>
      ctx.addIssue({ code: "custom", message: "R-268 Shrieker 等级、卡面或能力不符" });
    if (cards.map((c) => c.level).join() !== "2,3") fail();
    for (const c of cards) {
      const [boss, nest] = c.faces,
        l = c.level;
      if (
        boss.role !== "shrieker" ||
        nest.role !== "nest" ||
        boss.level !== l ||
        nest.level !== l ||
        boss.rawId !== `monster_large:weald:p00${3 + l}` ||
        nest.rawId !== `monster_large:weald:p00${6 + l}` ||
        [boss.life, boss.speed, boss.dodge, nest.life, nest.speed, nest.dodge].join() !==
          (l === 2 ? "60,3,3,30,0,0" : "72,3,4,40,0,0")
      )
        fail();
      if (
        boss.types.join() !== "eldritch,beast,large" ||
        boss.resistances.join() !== "stun,bleed,shuffle" ||
        boss.immunities.join() !== "blight" ||
        nest.types.join() !== "large" ||
        nest.resistances.length ||
        nest.immunities.join() !== "stun,bleed,blight,debuff,shuffle" ||
        nest.skills.length ||
        nest.selection.length
      )
        fail();
      if (
        JSON.stringify(boss.selection) !==
        JSON.stringify([
          { min: 1, max: 5, slot: 1 },
          { min: 6, max: 9, slot: 2 },
          { min: 10, max: 10, slot: 3 },
        ])
      )
        fail();
      const expected = [
        [
          1,
          "Peck",
          "closest",
          1,
          1,
          2,
          l === 2 ? 15 : 20,
          l === 2 ? 10 : 11,
          l === 2 ? 11 : 15,
          [
            { kind: "selfPull", distance: 1 },
            { kind: "bleed", amount: 3, duration: l === 2 ? 2 : 3 },
          ],
        ],
        [
          2,
          "Call the Murder",
          "crowded",
          1,
          4,
          1,
          l === 2 ? 4 : 6,
          l === 2 ? 10 : 11,
          l === 2 ? 2 : 3,
          [
            { kind: "selfPush", distance: 2 },
            { kind: "stress", amount: 1 },
          ],
        ],
        [
          3,
          "Regurgitate",
          "crowded",
          2,
          2,
          1,
          l === 2 ? 4 : 6,
          l === 2 ? 10 : 11,
          l === 2 ? 2 : 3,
          [{ kind: "debuff", duration: 2 }, { kind: "disease" }],
        ],
      ];
      if (
        boss.skills.length !== 3 ||
        boss.skills.some(
          (s, i) =>
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
              s.effects,
            ]) !== JSON.stringify(expected[i]),
        )
      )
        fail();
      if (
        c.abilities.descriptionCardId !== `boss_ability:weald:p00${l}` ||
        c.abilities.combatCardId !== `boss_ability:weald:p00${3 + l}` ||
        c.abilities.callTheMurder.printedHeal !== l + 1 ||
        c.abilities.threats.dungeon.mode !== (l === 2 ? "ignoreAfterRoll" : "gainThenDiscard") ||
        c.abilities.threats.hamlet.mode !== (l === 2 ? "discardReserve" : "reduceNormalDice")
      )
        fail();
    }
  });
export type WealdShriekerHigherContent = z.infer<typeof wealdShriekerHigherContentSchema>;
