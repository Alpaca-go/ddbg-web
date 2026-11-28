import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { warrensCurioFileSchema } from "../../../src/core/curios/curio";
import {
  loadNormalizedWarrensCurios,
  writeNormalizedWarrensCurios,
} from "../../../src/warrens/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensCurios();

const built = loadNormalizedWarrensCurios();

describe("Warrens 十六张 Curio", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(warrensCurioFileSchema.parse(read("normalized/extension/warrens/curio.json"))).toEqual(
      built,
    );
  });

  it("仅压力 +1 在词典已确认时接线，其余行停点", () => {
    expect(built.cards).toHaveLength(16);
    for (const card of built.cards) {
      expect(cardContentPack(card)).toBe("warrens");
      const wired = card.rows.filter((row) => row.effect !== null);
      const pending = card.rows.filter((row) => row.effect === null);
      for (const row of wired) {
        expect(row.effect?.type).toBe("stress");
      }
      for (const row of pending) expect(row.reason).toContain("Q-WARRENS-01");
    }
  });
});
