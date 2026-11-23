import { describe, expect, it } from "vitest";
import {
  assertMatrixShape,
  countVerdicts,
  EXPECTED_MATRIX_TOTAL,
  EXPECTED_SKILL_TOTAL,
  EXPECTED_STAT_TOTAL,
  filterRows,
  loadSeededReviewMatrix,
  mergeImportedMatrix,
} from "./hero-skills-review-matrix";

describe("Phase A0.5 review matrix", () => {
  it("indexes 432 rows = 378 skills + 54 stats; Leper batch is 21+3", () => {
    const matrix = loadSeededReviewMatrix();
    expect(assertMatrixShape(matrix)).toEqual([]);
    expect(matrix.counts.total).toBe(EXPECTED_MATRIX_TOTAL);
    expect(matrix.counts.hero_skill).toBe(EXPECTED_SKILL_TOTAL);
    expect(matrix.counts.hero_stat).toBe(EXPECTED_STAT_TOTAL);
    expect(matrix.counts.note).toMatch(/21\+3/);

    const leper = matrix.batches.leper!;
    expect(leper).toBeDefined();
    expect(leper.skill_count).toBe(21);
    expect(leper.stat_count).toBe(3);
    expect(leper.canonical_ids).toHaveLength(24);
    expect(leper.expected_cache_relative_paths).toHaveLength(24);
    expect(leper.status).toBe("prepared_pending_print_art");

    const leperRows = filterRows(matrix.rows, { batch: "leper" });
    expect(leperRows).toHaveLength(24);
    expect(leperRows.every((r) => r.hero === "LEPER")).toBe(true);
    expect(leperRows.every((r) => r.verdict === null)).toBe(true);
    expect(leperRows.every((r) => r.review_blocked)).toBe(true);
    expect(leperRows.some((r) => r.kind === "hero_stat")).toBe(true);
  });

  it("does not fabricate verdicts; all rows pending", () => {
    const matrix = loadSeededReviewMatrix();
    const counts = countVerdicts(matrix.rows);
    expect(counts.pending).toBe(EXPECTED_MATRIX_TOTAL);
    expect(counts.confirmed).toBe(0);
    expect(matrix.rows.every((r) => r.evidence === null && r.reviewer === null)).toBe(true);
  });

  it("lists Leper expected cache-relative png paths under png/", () => {
    const paths = loadSeededReviewMatrix().batches.leper!.expected_cache_relative_paths;
    expect(paths.every((p) => p.startsWith("png/") && p.endsWith(".png"))).toBe(true);
    expect(paths.some((p) => p.includes("SKILLS_FRONT") && p.includes("_p274.png"))).toBe(true);
    expect(paths.some((p) => p.includes("Hero_STAT"))).toBe(true);
  });

  it("merge import rejects wrong shape and keeps pending policy", () => {
    const base = loadSeededReviewMatrix();
    const bad = { ...base, rows: base.rows.slice(0, 10) };
    const rejected = mergeImportedMatrix(base, bad);
    expect(rejected.errors.length).toBeGreaterThan(0);
    expect(rejected.matrix).toBe(base);
  });
});
