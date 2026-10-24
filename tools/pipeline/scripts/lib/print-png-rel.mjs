/**
 * Match tools/pipeline/print-card-art/ddbg_print_art/paths.py slug + png basename.
 */
export function slugifyPdfRel(pdfRel) {
  let s = pdfRel.replace(/\\/g, "/");
  s = s.replace(/[^A-Za-z0-9._-]+/g, "_");
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s.length > 180 ? s.slice(0, 180) : s;
}

/** Same shape as Python `png_basename` → `png/{slug}_pNNN.png` (slug already ends with `.pdf`). */
export function pngBasename(pdfRel, page, { old = false } = {}) {
  const slug = slugifyPdfRel(pdfRel);
  const suffix = old ? "_old" : "";
  const pagePart = String(page).padStart(3, "0");
  return `${slug}_p${pagePart}${suffix}.png`;
}

export function pngRelFromPdf(pdfRel, page, options) {
  return `png/${pngBasename(pdfRel, page, options)}`;
}

export const COREBOX_STAT_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf";
export const COREBOX_STAT_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf";
export const COREBOX_SKILLS_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf";
