import { readFileSync, writeFileSync } from "node:fs";
import { it, expect } from "vitest";
import { loadNormalizedCorebox } from "./write";
const path = new URL("../../normalized/corebox/trinket.json", import.meta.url);
const built = loadNormalizedCorebox().trinket;
if (process.env.WRITE_TRINKET_R127 === "1")
  writeFileSync(path, JSON.stringify(built, null, 1) + "\n");
it("R-127：仅饰品重建一致，疾病缺失行、Dodge与负面怪癖使用批准含义", () => {
  expect(built).toEqual(JSON.parse(readFileSync(path, "utf8")));
  const book = built.cards.find((c) => c.id === "trinket:p016")!;
  expect(
    book.upright_half.effect_lines
      .flat()
      .some((s) => s.type === "icon" && s.icon.key === "disease"),
  ).toBe(true);
  for (const id of ["trinket:p010", "trinket:p019", "trinket:p029"])
    expect(
      built.cards
        .find((c) => c.id === id)!
        .upright_half.effect_lines.flat()
        .some((s) => s.type === "icon" && s.icon.iconId === "22c0a26f50" && s.icon.key === "dodge"),
    ).toBe(true);
  expect(
    built.cards
      .find((c) => c.id === "trinket:p038")!
      .inverted_half.effect_lines.flat()
      .some((s) => s.type === "icon" && s.icon.key === "draw_negative_quirk"),
  ).toBe(true);
  expect(built.cards.every((c) => !c.verification.unverified)).toBe(true);
});
