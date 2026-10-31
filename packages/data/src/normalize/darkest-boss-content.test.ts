import { rawFileSchema } from "../extract/raw";
import { normalizedMonsterMediumFileSchema, normalizedMonsterLargeFileSchema } from "./schema";
import { buildDarkestBossContent } from "./darkest-boss-content";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { darkestBossContentSchema, finalBattlePlanForQuest } from "../darkest-boss-content";

const built = loadNormalizedCorebox().darkest_boss_content;
const target = new URL("../../normalized/corebox/darkest_boss_content.json", import.meta.url);
if (process.env.WRITE_DARKEST_BOSSES === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);
const file = darkestBossContentSchema.parse(JSON.parse(readFileSync(target, "utf8")));

it("三任务Boss与四最终形态可再生；初始先攻分别2/4/2，特殊行动不伪造固定数值", () => {
  expect(built).toEqual(file);
  expect(file.encounters.map((e) => e.actors.reduce((n, a) => n + a.initiativeCards, 0))).toEqual([
    2, 4, 2,
  ]);
  expect(file.finalBattle.forms[0]!.actor.actionsPerRound).toBe("special");
  expect(file.finalBattle.forms.every((f) => !f.combatReady)).toBe(true);
});

it("p16取消二形态、p17取消一形态、p18取消孕育之心；最终形态不可跳，保留同一房间与4天准备", () => {
  const expected = [
    ["ancestor1", "gestatingHeart", "heartOfDarkness"],
    ["ancestor2", "gestatingHeart", "heartOfDarkness"],
    ["ancestor1", "ancestor2", "heartOfDarkness"],
  ];
  const before = JSON.stringify(file);
  for (const [i, q] of ["quest:p016", "quest:p017", "quest:p018"].entries()) {
    const plan = finalBattlePlanForQuest(file, q);
    expect(plan.forms.map((f) => f.id)).toEqual(expected[i]);
    expect(plan).toMatchObject({
      preparationDays: 4,
      drawHamletEvent: false,
      exploration: false,
      rollProvisions: true,
      roomCardId: "room:p025",
    });
  }
  expect(() => finalBattlePlanForQuest(file, "quest:p019")).toThrow();
  expect(JSON.stringify(file)).toBe(before);
  expect(
    darkestBossContentSchema.safeParse({
      ...file,
      finalBattle: { ...file.finalBattle, forms: [...file.finalBattle.forms].reverse() },
    }).success,
  ).toBe(false);
  expect(
    darkestBossContentSchema.safeParse({
      ...file,
      encounters: file.encounters.map((e) => ({ ...e, skipFinalForm: "heartOfDarkness" })),
    }).success,
  ).toBe(false);
});

it("能力卡行动数、战斗卡名字与任务SPECIAL漂移拒绝，不按同名或等级猜测", () => {
  const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const quests = rawFileSchema.parse(read("../../extract/corebox/raw/quest.json"));
  const abilities = rawFileSchema.parse(read("../../extract/corebox/raw/boss_ability.json"));
  const medium = normalizedMonsterMediumFileSchema.parse(
    read("../../normalized/corebox/monster_medium.json"),
  );
  const large = normalizedMonsterLargeFileSchema.parse(
    read("../../normalized/corebox/monster_large.json"),
  );
  const wrongActions = {
    ...abilities,
    cards: abilities.cards.map((c) =>
      c.id === "boss_ability:p033"
        ? {
            ...c,
            faces: {
              ...c.faces,
              front: {
                ...c.faces.front,
                lines: c.faces.front.lines.map((l) => ({
                  ...l,
                  text: l.text.replace("ACTIONS / Round: 2", "ACTIONS / Round: 3"),
                })),
              },
            },
          }
        : c,
    ),
  };
  expect(() => buildDarkestBossContent(quests, wrongActions, medium, large)).toThrow();
  const wrongQuest = {
    ...quests,
    cards: quests.cards.map((c) =>
      c.id === "quest:p016"
        ? {
            ...c,
            faces: {
              ...c.faces,
              front: {
                ...c.faces.front,
                lines: c.faces.front.lines.map((l) => ({
                  ...l,
                  text: l.text.replace("2nd Form", "1st Form"),
                })),
              },
            },
          }
        : c,
    ),
  };
  expect(() => buildDarkestBossContent(wrongQuest, abilities, medium, large)).toThrow();
  expect(
    darkestBossContentSchema.safeParse({
      ...file,
      finalBattle: {
        ...file.finalBattle,
        forms: file.finalBattle.forms.map((f, i) =>
          i ? f : { ...f, actor: { ...f.actor, initiativeCards: 5 } },
        ),
      },
    }).success,
  ).toBe(false);
});
