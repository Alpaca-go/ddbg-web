import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { coveCurioFileSchema, planCurioEffects } from "../curio";
import { buildCoveCurios } from "./cove-curios";
import { loadNormalizedCoveCurios, writeNormalizedCoveCurios } from "./write-cove";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as unknown;
const input = () => ({
  raw: rawFileSchema.parse(read("extract/extension/cove/raw/curio.json")),
});
if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveCurios();
const built = loadNormalizedCoveCurios();

describe("Cove 16 张 Curio 转录与审阅边界（C1、R14、R-048、Q-186）", () => {
  it("完整保留 16 张、64 行与同名异卡，重建与提交文件一致", () => {
    expect(coveCurioFileSchema.parse(read("normalized/extension/cove/curio.json"))).toEqual(built);
    expect(built.cards.map((card) => card.source.page)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    expect(built.cards.every((card) => card.rows.length === 4)).toBe(true);
    expect(built.cards.filter((card) => card.name === "Bas Relief")).toHaveLength(2);
    expect(built.cards[0]?.rows).not.toEqual(built.cards[1]?.rows);
  });

  it("仅词典确认的压力与补给骰可直接结算，其余行停点", () => {
    const ready = built.cards.flatMap((card) => card.rows).filter((row) => row.effect !== null);
    expect(ready).toHaveLength(12);
    expect(
      ready.every(
        (row) =>
          row.effect?.type === "stress" ||
          (row.effect?.type === "rollProvision" && row.effect.count === 1),
      ),
    ).toBe(true);
    for (const card of built.cards) expect(planCurioEffects(card, false).status).toBe("pending");
  });

  it("来源、图标顺序或印刷数字漂移会失败", () => {
    const source = input();
    expect(() => buildCoveCurios({ ...source.raw, n_copies_total: 15 })).toThrow();
    expect(() =>
      buildCoveCurios({
        ...source.raw,
        cards: source.raw.cards.map((card, index) =>
          index === 0 ? { ...card, id: "curio:cove:p999" } : card,
        ),
      }),
    ).toThrow();
  });
});
