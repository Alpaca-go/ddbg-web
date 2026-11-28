import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { cardContentPack } from "../../../src/shared/content-packs";
import { buildWarrensPunchboard } from "../../../src/warrens/punchboard/punchboard.build";
import { warrensPunchboardFileSchema } from "../../../src/warrens/punchboard/punchboard";

const root = new URL("../../../extract/extension/warrens/", import.meta.url);
const raw = rawFileSchema.parse(
  JSON.parse(readFileSync(new URL("raw/punchboard.json", root), "utf8")) as unknown,
);
const built = buildWarrensPunchboard(raw);

describe("Warrens punchboard 规范化（MG_DD_04；R-001、R-048）", () => {
  it("单张冲压板、四枚双面立牌组件；几何未核准", () => {
    expect(warrensPunchboardFileSchema.parse(built)).toEqual(built);
    expect(built.sheet.id).toBe("punchboard:warrens:p001");
    expect(built.sheet.geometryVerified).toBe(false);
    expect(built.components).toHaveLength(4);
    for (const row of built.components) {
      expect(row.geometryVerified).toBe(false);
      expect(row.kind).toBe("hero_standee");
      expect(cardContentPack({ id: row.id })).toBe("warrens");
      expect(row.pendingReview[0]).toMatch(/Q-WARRENS-22/);
    }
    expect(new Set(built.components.map((c) => c.hero))).toEqual(new Set(["LEPER", "ANTIQUARIAN"]));
  });

  it("WRITE_NORMALIZED=1 时重写 extension/warrens/punchboard.json", () => {
    if (process.env.WRITE_NORMALIZED !== "1") return;
    const out = new URL("../../../normalized/extension/warrens/punchboard.json", import.meta.url);
    mkdirSync(new URL("../../../normalized/extension/warrens/", import.meta.url), {
      recursive: true,
    });
    writeFileSync(out, JSON.stringify(built, null, 2) + "\n", "utf8");
  });
});
