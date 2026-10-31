import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";

import {
  absoluteNothingnessSupportSchema,
  buildAbsoluteNothingnessSupport,
  findAbsoluteNothingnessMonsterCards,
  readAbsoluteNothingnessSupport,
} from "../absolute-nothingness-support";
import { rawFileSchema } from "../extract/raw";
import { normalizedMonsterLargeFileSchema, normalizedMonsterMediumFileSchema } from "./schema";
import { loadNormalizedCorebox } from "./write";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const medium = normalizedMonsterMediumFileSchema.parse(
  read("../../normalized/corebox/monster_medium.json"),
);
const large = normalizedMonsterLargeFileSchema.parse(
  read("../../normalized/corebox/monster_large.json"),
);
const mediumRaw = rawFileSchema.parse(read("../../extract/corebox/raw/monster_medium.json"));
const largeRaw = rawFileSchema.parse(read("../../extract/corebox/raw/monster_large.json"));
const abilities = rawFileSchema.parse(read("../../extract/corebox/raw/boss_ability.json"));

const built = buildAbsoluteNothingnessSupport(medium, large, mediumRaw, largeRaw, abilities);
const target = new URL("../../normalized/corebox/absolute_nothingness_support.json", import.meta.url);
if (process.env.WRITE_ABSOLUTE_NOTHINGNESS === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);
const file = absoluteNothingnessSupportSchema.parse(JSON.parse(readFileSync(target, "utf8")));

it("核心盒怪物 PDF 无 Absolute Nothingness 战斗卡；目录为 pending 且 supportCardIds 为空", () => {
  expect(loadNormalizedCorebox().absolute_nothingness_support).toEqual(built);
  expect(built).toEqual(file);
  expect(findAbsoluteNothingnessMonsterCards(medium, large)).toEqual([]);
  expect(built.status).toBe("pending_monster_card");
  expect(built.supportCardIds).toEqual([]);
  expect(built.abilityCardId).toBe("boss_ability:p035");
  expect(built.combatReady).toBe(false);
  expect(readAbsoluteNothingnessSupport(built).notes.join(" ")).toContain("3x Absolute Nothingness");
});

it("ancestor2 形态 supportCardIds 与 Absolute Nothingness 目录一致（当前皆为空）", () => {
  const content = loadNormalizedCorebox().darkest_boss_content;
  const ancestor2 = content.finalBattle.forms.find((f) => f.id === "ancestor2")!;
  expect(ancestor2.supportCardIds).toEqual(built.supportCardIds);
  expect(ancestor2.actor.cardId).toBe(built.bossActorCardId);
});

it("拒绝缺能力卡、重复怪物身份、错误来源页码", () => {
  const missingAbility = {
    ...abilities,
    cards: abilities.cards.filter((c) => c.id !== "boss_ability:p035"),
  };
  expect(() =>
    buildAbsoluteNothingnessSupport(medium, large, mediumRaw, largeRaw, missingAbility),
  ).toThrow();

  const wrongPage = structuredClone(abilities);
  const p35 = wrongPage.cards.find((c) => c.id === "boss_ability:p035")!;
  p35.faces.front.page = 34;
  expect(() =>
    buildAbsoluteNothingnessSupport(medium, large, mediumRaw, largeRaw, wrongPage),
  ).toThrow();

  const withFake = structuredClone(medium);
  const perfect = withFake.cards.find((c) => c.id === "monster_medium:p106")!;
  withFake.cards.push({
    ...perfect,
    id: "monster_medium:p999",
    name: "Absolute Nothingness",
  });
  expect(() =>
    buildAbsoluteNothingnessSupport(withFake, large, mediumRaw, largeRaw, abilities),
  ).toThrow(/页码|来源/);

  const duplicate = structuredClone(medium);
  duplicate.cards.push({
    ...(duplicate.cards.find((c) => c.id === "monster_medium:p105") as (typeof duplicate.cards)[0]),
    id: "monster_medium:p998",
    name: "Absolute Nothingness",
    pages: [998],
  });
  duplicate.cards.push({
    ...(duplicate.cards.find((c) => c.id === "monster_medium:p105") as (typeof duplicate.cards)[0]),
    id: "monster_medium:p997",
    name: "Absolute Nothingness",
    pages: [997],
  });
  expect(() =>
    buildAbsoluteNothingnessSupport(duplicate, large, mediumRaw, largeRaw, abilities),
  ).toThrow(/identity/);
});
