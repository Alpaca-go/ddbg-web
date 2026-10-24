import { describe, expect, it } from "vitest";
import { pngBasename, pngRelFromPdf } from "./print-png-rel.mjs";

const CORE_STAT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf";

describe("print-png-rel (aligned with Python paths.png_basename)", () => {
  it("does not double .pdf before _pNNN", () => {
    const base = pngBasename(CORE_STAT, 1);
    expect(base).not.toContain(".pdf.pdf");
    expect(base).toMatch(/\.pdf_p001\.png$/);
    const rel = pngRelFromPdf(CORE_STAT, 1);
    expect(rel).toBe(
      "png/DARKEST_DUNGEON_PRINT_EN_WAVE_1_MG_DD_01_EN_COREBOX_Print_02_DD_CARDS_COREBOX_DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf_p001.png",
    );
    expect(rel).not.toContain(".pdf.pdf");
  });

  it("matches Kyries core skill CSV pngRel shape", () => {
    const skills =
      "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf";
    expect(pngRelFromPdf(skills, 42)).toContain("_SKILLS_FRONT.pdf_p042.png");
    expect(pngRelFromPdf(skills, 42)).not.toContain(".pdf.pdf");
  });
});
