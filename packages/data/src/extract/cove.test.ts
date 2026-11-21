import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../content-packs";
import { rawFileSchema } from "./raw";

const root = new URL("../../extract/extension/cove/", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

describe("Cove 地点印刷导入（R-001、R-048；Cove C1）", () => {
  it("Curio 16 张副本、正反面与 cove 命名空间完整", () => {
    const file = rawFileSchema.parse(read("raw/curio.json"));
    expect(file.category).toBe("curio");
    expect(file.n_pages).toBe(16);
    expect(file.n_copies_total).toBe(16);
    expect(file.cards.flatMap((card) => card.pages).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    for (const card of file.cards) {
      expect(cardContentPack(card)).toBe("cove");
      expect(card.id.startsWith("curio:cove:")).toBe(true);
      expect(card.faces.front.page).toBe(card.pages[0]);
      expect(card.faces.back?.page).toBe(card.pages[0]);
      for (const face of Object.values(card.faces)) {
        if (!face) continue;
        expect(face.file).toContain("MG_DD_05_EN_COVE/");
        expect(face.file).toMatch(/DD_EN_COVE_CARDS_63x88_CURIO_(FRONT|BACK)\.pdf$/);
      }
    }
  });
});
