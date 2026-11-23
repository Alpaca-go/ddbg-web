import type { ReviewMatrix, ReviewMatrixRow, ReviewVerdict } from "./hero-skills-review-types";
import { REVIEW_VERDICTS } from "./hero-skills-review-types";
import seededMatrix from "../../../../docs/reviews/hero-skills-2026-11-23.json";

export const EXPECTED_MATRIX_TOTAL = 432;
export const EXPECTED_SKILL_TOTAL = 378;
export const EXPECTED_STAT_TOTAL = 54;

export function loadSeededReviewMatrix(): ReviewMatrix {
  return seededMatrix as ReviewMatrix;
}

export function assertMatrixShape(matrix: ReviewMatrix): string[] {
  const errors: string[] = [];
  if (matrix.schema !== "ddbg.hero-skills-review-matrix.v1") {
    errors.push(`unexpected schema: ${matrix.schema}`);
  }
  if (matrix.rows.length !== EXPECTED_MATRIX_TOTAL) {
    errors.push(`rows ${matrix.rows.length} !== ${EXPECTED_MATRIX_TOTAL}`);
  }
  const skills = matrix.rows.filter((r) => r.kind === "hero_skill").length;
  const stats = matrix.rows.filter((r) => r.kind === "hero_stat").length;
  if (skills !== EXPECTED_SKILL_TOTAL) errors.push(`skills ${skills} !== ${EXPECTED_SKILL_TOTAL}`);
  if (stats !== EXPECTED_STAT_TOTAL) errors.push(`stats ${stats} !== ${EXPECTED_STAT_TOTAL}`);
  const leper = matrix.batches.leper;
  if (!leper) errors.push("missing leper batch");
  else {
    if (leper.skill_count !== 21) errors.push(`leper skills ${leper.skill_count} !== 21`);
    if (leper.stat_count !== 3) errors.push(`leper stats ${leper.stat_count} !== 3`);
    if (leper.canonical_ids.length !== 24) {
      errors.push(`leper ids ${leper.canonical_ids.length} !== 24`);
    }
  }
  for (const row of matrix.rows) {
    if (row.verdict != null && !REVIEW_VERDICTS.includes(row.verdict)) {
      errors.push(`${row.canonical_id}: invalid verdict ${row.verdict}`);
    }
  }
  return errors;
}

export function filterRows(
  rows: readonly ReviewMatrixRow[],
  opts: { batch?: string | null; hero?: string | null; kind?: ReviewMatrixRow["kind"] | null },
): ReviewMatrixRow[] {
  return rows.filter((r) => {
    if (opts.batch && r.batch !== opts.batch) return false;
    if (opts.hero && r.hero !== opts.hero) return false;
    if (opts.kind && r.kind !== opts.kind) return false;
    return true;
  });
}

export function countVerdicts(rows: readonly ReviewMatrixRow[]) {
  let pending = 0;
  const byVerdict: Record<ReviewVerdict, number> = {
    confirmed: 0,
    needs_fix: 0,
    ambiguous: 0,
    stop: 0,
  };
  for (const r of rows) {
    if (r.verdict == null) pending++;
    else byVerdict[r.verdict]++;
  }
  return { pending, ...byVerdict };
}

/** 合并导入矩阵：仅覆盖审阅字段，保留索引元数据；拒绝编造时由调用方校验。 */
export function mergeImportedMatrix(
  base: ReviewMatrix,
  incoming: ReviewMatrix,
): { matrix: ReviewMatrix; errors: string[] } {
  const errors = assertMatrixShape(incoming);
  if (errors.length) return { matrix: base, errors };
  const byId = new Map(incoming.rows.map((r) => [r.canonical_id, r]));
  const rows = base.rows.map((row) => {
    const next = byId.get(row.canonical_id);
    if (!next) return row;
    return {
      ...row,
      verdict: next.verdict,
      evidence: next.evidence,
      reviewer: next.reviewer,
      date: next.date,
      qid: next.qid,
      notes: next.notes,
      printed_lines: next.printed_lines,
      current_effects: next.current_effects,
    };
  });
  return { matrix: { ...base, rows }, errors: [] };
}

export function downloadMatrixJson(matrix: ReviewMatrix, filename = "hero-skills-2026-11-23.json") {
  const blob = new Blob([JSON.stringify(matrix, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readMatrixFile(file: File): Promise<ReviewMatrix> {
  const text = await file.text();
  return JSON.parse(text) as ReviewMatrix;
}
