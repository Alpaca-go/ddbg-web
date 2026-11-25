import { z } from "zod";
import {
  wealdPounderCombatFaceSchema as baseFace,
  wealdPounderContentSchema as base,
} from "./weald-pounder";

const face = baseFace.extend({
  rawId: z.enum([
    "monster_medium:weald:p021",
    "monster_medium:weald:p022",
    "monster_medium:weald:p024",
    "monster_medium:weald:p025",
  ]),
  level: z.union([z.literal(2), z.literal(3)]),
  skill: z.discriminatedUnion("target", [
    baseFace.shape.skill.options[0].extend({
      critDamage: z.int().positive(),
      accuracy: z.int().positive(),
      damage: z.int().positive(),
    }),
    baseFace.shape.skill.options[1],
  ]),
});
const abilities = base.shape.abilities.extend({
  descriptionCardId: z.enum(["boss_ability:weald:p008", "boss_ability:weald:p009"]),
  combatCardId: z.enum(["boss_ability:weald:p011", "boss_ability:weald:p012"]),
  reinforcements: z.strictObject({
    condition: z.literal("matchmanAbsent"),
    mode: z.literal("fillToComposition"),
    matchmen: z.literal(1),
    companionCardId: z.enum(["monster_large:p002", "monster_medium:p056"]),
    companionLevel: z.union([z.literal(1), z.literal(3)]),
    companions: z.union([z.literal(1), z.literal(2)]),
  }),
  threats: z.strictObject({
    dungeon: base.shape.abilities.shape.threats.shape.dungeon.extend({
      name: z.enum(["Bullseye Guillotine II", "Bullseye Guillotine III"]),
      buffDuration: z.union([z.literal(2), z.literal(3)]),
      riposteDuration: z.union([z.literal(2), z.literal(3)]),
    }),
    hamlet: base.shape.abilities.shape.threats.shape.hamlet.extend({
      name: z.enum(["Bombardment II", "Bombardment III"]),
      heroDamage: z.union([z.literal(7), z.literal(9)]),
    }),
  }),
});

/** R-268 先行实现目录；同名参考卡不增加召唤实体，最终逐项核对另记。 */
export const wealdPounderHigherContentSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-pounder-higher-v1"),
    ruling: z.literal("R-268"),
    combatReady: z.literal(false),
    sources: base.shape.sources,
    cards: z
      .array(
        z.strictObject({
          level: z.union([z.literal(2), z.literal(3)]),
          faces: z.tuple([face, face]),
          abilities,
        }),
      )
      .length(2),
  })
  .superRefine(({ cards }, ctx) => {
    const fail = () =>
      ctx.addIssue({ code: "custom", message: "R-268 Pounder 等级、卡面或召唤来源不匹配" });
    if (cards.map((c) => c.level).join() !== "2,3") fail();
    for (const c of cards) {
      const [boss, matchman] = c.faces;
      const l = c.level;
      const cannon = boss.skill;
      const summon = c.abilities.reinforcements;
      if (
        boss.role !== "pounder" ||
        matchman.role !== "matchman" ||
        boss.level !== l ||
        matchman.level !== l ||
        boss.rawId !== `monster_medium:weald:p0${19 + l}` ||
        matchman.rawId !== `monster_medium:weald:p0${22 + l}` ||
        boss.selection !== "triggerOnly" ||
        matchman.selection !== "skill1AllStances" ||
        cannon.target !== "crowded" ||
        matchman.skill.target !== "pounder"
      ) {
        fail();
        continue;
      }
      if (
        [
          boss.life,
          boss.dodge,
          boss.speed,
          matchman.life,
          matchman.dodge,
          matchman.speed,
          cannon.critDamage,
          cannon.accuracy,
          cannon.damage,
        ].join() !== (l === 2 ? "70,1,0,9,3,1,24,10,12" : "90,2,0,11,4,1,34,11,17")
      )
        fail();
      if (
        c.abilities.descriptionCardId !== `boss_ability:weald:p00${6 + l}` ||
        c.abilities.combatCardId !== `boss_ability:weald:p0${9 + l}` ||
        [summon.companionCardId, summon.companionLevel, summon.companions].join() !==
          (l === 2 ? "monster_large:p002,1,1" : "monster_medium:p056,3,2")
      )
        fail();
      if (
        c.abilities.threats.dungeon.buffDuration !== l ||
        c.abilities.threats.dungeon.riposteDuration !== l ||
        c.abilities.threats.hamlet.heroDamage !== (l === 2 ? 7 : 9)
      )
        fail();
    }
  });
export type WealdPounderHigherContent = z.infer<typeof wealdPounderHigherContentSchema>;
