import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";

const root = new URL("../../../extract/extension/cove/", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

const roomComponents = { curio: 16, room: 12 } as const;

describe("Cove 地点印刷导入（R-001、R-048；Cove C1）", () => {
  it.each(Object.entries(roomComponents))(
    "%s 的副本、正反面与 cove 命名空间完整",
    (category, count) => {
      const file = rawFileSchema.parse(read(`raw/${category}.json`));
      expect(file.category).toBe(category);
      expect(file.n_pages).toBe(count);
      expect(file.n_copies_total).toBe(count);
      expect(file.cards.flatMap((card) => card.pages).sort((a, b) => a - b)).toEqual(
        Array.from({ length: count }, (_, i) => i + 1),
      );
      const stem =
        category === "curio"
          ? /DD_EN_COVE_CARDS_63x88_CURIO_(FRONT|BACK)\.pdf$/
          : /DD_EN_COVE_CARDS_63x88_rooms_(FRONT|BACK)\.pdf$/;
      for (const card of file.cards) {
        expect(cardContentPack(card)).toBe("cove");
        expect(card.id.includes(":cove:")).toBe(true);
        expect(card.faces.front.page).toBe(card.pages[0]);
        expect(card.faces.back?.page).toBe(card.pages[0]);
        for (const face of Object.values(card.faces)) {
          if (!face) continue;
          expect(face.file).toContain("MG_DD_05_EN_COVE/");
          expect(face.file).toMatch(stem);
        }
      }
    },
  );
});
