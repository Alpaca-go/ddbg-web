import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { readDarkestBossAbility } from "../darkest-boss-abilities";
import { buildDarkestBossAbilities } from "./darkest-boss-abilities";
import { loadNormalizedCorebox } from "./write";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/boss_ability.json", import.meta.url), "utf8"),
  ),
);
const built = buildDarkestBossAbilities(raw);
const target = new URL("../../normalized/corebox/darkest_boss_abilities.json", import.meta.url);
if (process.env.WRITE_DARKEST_ABILITIES === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

it("九张能力卡经规范化管线可再生，保留Special和原始图标而不解锁战斗", () => {
  expect(loadNormalizedCorebox().darkest_boss_abilities).toEqual(built);
  expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
  expect(readDarkestBossAbility(built, "boss_ability:p034")?.actionsPerRound).toBe("special");
  expect(readDarkestBossAbility(built, "boss_ability:p036")?.textLines.join(" ")).toContain(
    "{icon:90558ded71}",
  );
  expect(built.cards.every((c) => !c.combatReady)).toBe(true);
  expect(readDarkestBossAbility(built, "boss_ability:p001")).toBeUndefined();
  const copy = readDarkestBossAbility(built, "boss_ability:p033")!;
  copy.textLines.length = 0;
  expect(readDarkestBossAbility(built, copy.id)?.textLines.length).toBeGreaterThan(0);
});

it("拒绝缺卡、重复卡、错误来源和行动数漂移", () => {
  for (const mutation of ["missing", "duplicate", "page", "file", "actions"] as const) {
    const bad = structuredClone(raw);
    const card = bad.cards.find((c) => c.id === "boss_ability:p034")!;
    if (mutation === "missing") bad.cards = bad.cards.filter((c) => c !== card);
    if (mutation === "duplicate") bad.cards.push(structuredClone(card));
    if (mutation === "page") card.faces.front.page = 1;
    if (mutation === "file") card.faces.front.file = "other.pdf";
    if (mutation === "actions")
      card.faces.front.lines = card.faces.front.lines.map((l) => ({
        ...l,
        text: l.text.replace("Round: Special", "Round: 2"),
      }));
    expect(() => buildDarkestBossAbilities(bad), mutation).toThrow();
  }
});
