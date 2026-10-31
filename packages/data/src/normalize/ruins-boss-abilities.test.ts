import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { readRuinsBossAbility, ruinsBossAbilitiesSchema } from "../ruins-boss-abilities";
import { buildRuinsBossAbilities } from "./ruins-boss-abilities";
import { loadNormalizedCorebox } from "./write";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/boss_ability.json", import.meta.url), "utf8"),
  ),
);
const built = buildRuinsBossAbilities(raw);
const target = new URL("../../normalized/corebox/ruins_boss_abilities.json", import.meta.url);
if (process.env.WRITE_RUINS_ABILITIES === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

it("四Boss三级双面可再生，能力和威胁文字保留图标与原始行序", () => {
  expect(loadNormalizedCorebox().ruins_boss_abilities).toEqual(built);
  expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
  for (const c of built.cards) {
    const source = raw.cards.find((r) => r.id === c.id)!;
    expect(c.back.textLines).toEqual(source.faces.back!.lines.slice(1).map((l) => l.text));
    expect(c.front.textLines.join(" ").length).toBeGreaterThan(0);
    expect(readRuinsBossAbility(built, c.bossId, c.level)?.id).toBe(c.id);
  }
  expect(readRuinsBossAbility(built, "collector", 2)?.back.textLines).toContain(
    "Already Collected",
  );
  expect(readRuinsBossAbility(built, "fanatic", 3)?.back.textLines.join(" ")).toContain(
    "{icon:945357953a}",
  );
  expect(readRuinsBossAbility(built, "hag", 1)).toBeUndefined();
  const copy = readRuinsBossAbility(built, "prophet", 2)!;
  copy.back.textLines.length = 0;
  expect(readRuinsBossAbility(built, "prophet", 2)?.back.textLines.length).toBeGreaterThan(0);
});

it("拒绝缺卡、重复、双面来源/等级/页码错误和行动数漂移", () => {
  for (const mutation of [
    "missing",
    "duplicate",
    "back",
    "file",
    "level",
    "page",
    "actions",
  ] as const) {
    const bad = structuredClone(raw);
    const card = bad.cards.find((c) => c.id === "boss_ability:p011")!;
    if (mutation === "missing") bad.cards = bad.cards.filter((c) => c !== card);
    if (mutation === "duplicate") bad.cards.push(structuredClone(card));
    if (mutation === "back") delete card.faces.back;
    if (mutation === "file") card.faces.back!.file = "other.pdf";
    if (mutation === "level") card.faces.back!.lines[0]!.text = "{icon:0c9e989b70} III";
    if (mutation === "page") card.faces.back!.page = 10;
    if (mutation === "actions")
      card.faces.front.lines = card.faces.front.lines.map((l) => ({
        ...l,
        text: l.text.replace("Round: 3", "Round: 2"),
      }));
    expect(() => buildRuinsBossAbilities(bad), mutation).toThrow();
  }
  expect(ruinsBossAbilitiesSchema.safeParse({ ...built, cards: [] }).success).toBe(false);
  const altered = structuredClone(built);
  altered.cards[0]!.level = 2;
  expect(ruinsBossAbilitiesSchema.safeParse(altered).success).toBe(false);
});
