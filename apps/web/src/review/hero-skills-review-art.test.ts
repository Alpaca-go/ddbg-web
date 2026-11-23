import { describe, expect, it } from "vitest";
import { resolveReviewPrintArt } from "./hero-skills-review-art";
import { filterRows, loadSeededReviewMatrix } from "./hero-skills-review-matrix";

describe("review print art resolution", () => {
  it("bridges Leper canonical skill ids to art-map pngRel without changing global map ids", () => {
    const chop = filterRows(loadSeededReviewMatrix().rows, { batch: "leper" }).find(
      (r) => r.canonical_id === "hero_skill:warrens:h14:p274",
    )!;
    const art = resolveReviewPrintArt(chop);
    expect(art.pngRel).toContain("_p274.png");
    expect(art.url).toMatch(/^\/print-card-art\/png\//);
    expect(art.artMapId).toBe("hero_skill:art:leper:p274");
    expect(art.bridge).toBe("hero+printPage");
  });

  it("resolves Leper stat faces by canonical id", () => {
    const stat = filterRows(loadSeededReviewMatrix().rows, { batch: "leper" }).find(
      (r) => r.canonical_id === "hero_stat:warrens:h14:p028:front",
    )!;
    const art = resolveReviewPrintArt(stat);
    expect(art.pngRel).toContain("Hero_STAT_FRONT");
    expect(art.url).toMatch(/^\/print-card-art\/png\//);
    expect(art.artMapId).toBe("hero_stat:warrens:h14:p028:front");
  });
});
