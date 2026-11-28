import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";

const root = new URL("../../../extract/extension/warrens/", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

describe("Warrens Punchboard 印刷导入", () => {
  it("punchboard 副本、正反面和命名空间完整", () => {
    const file = rawFileSchema.parse(read("raw/punchboard.json"));
    expect(file.category).toBe("punchboard");
    expect(file.n_pages).toBe(1);
    expect(file.n_copies_total).toBe(1);
    expect(file.cards).toHaveLength(1);
    expect(file.cards[0]!.id).toBe("punchboard:warrens:p001");
    expect(cardContentPack(file.cards[0]!)).toBe("warrens");
    const card = file.cards[0]!;
    expect(card.faces.front.page).toBe(1);
    expect(card.faces.back?.page).toBe(1);
    expect(card.faces.front.file).toContain("MG_DD_04_EN_WARRENS/");
    expect(card.faces.back?.file).toContain("MG_DD_04_EN_WARRENS/");
    const frontText = card.faces.front.lines.map((l) => l.text).join(" ");
    const backText = card.faces.back?.lines.map((l) => l.text).join(" ") ?? "";
    expect(frontText).toContain("LEPER");
    expect(frontText).toContain("ANTIQUARIAN");
    expect(backText).toContain("LEPER");
    expect(backText).toContain("ANTIQUARIAN");
    expect(card.faces.front.trim_mm).toEqual([145, 95]);
  });
});
