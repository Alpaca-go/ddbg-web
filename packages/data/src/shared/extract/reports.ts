import { z } from "zod";

const sha1Schema = z.string().regex(/^[0-9a-f]{40}$/);

const countSchema = z.strictObject({
  pages: z.int().nonnegative(),
  unique: z.int().nonnegative(),
  copies: z.int().nonnegative(),
});

const parseStatsSchema = z.strictObject({
  cards: z.int().nonnegative(),
  ok: z.int().nonnegative(),
  failed: z.int().nonnegative(),
  success_rate: z.number().min(0).max(1),
});

/** `reports/summary.json`。`outputs` 的路径相对于提取器输出根目录。 */
export const extractSummarySchema = z.strictObject({
  extractor_version: z.literal("1.0.4"),
  print_root: z.string().min(1),
  sources: z.array(
    z.strictObject({
      file: z.string().min(1),
      bytes: z.int().nonnegative(),
    }),
  ),
  text_free: z.array(
    z.strictObject({
      file: z.string().min(1),
      label: z.string().min(1),
      note: z.string().min(1),
      pages: z.int().positive(),
    }),
  ),
  outputs: z.record(
    z.string(),
    z.strictObject({
      bytes: z.int().nonnegative(),
      sha1: sha1Schema,
    }),
  ),
  total_json_bytes: z.strictObject({
    raw: z.int().nonnegative(),
    parsed: z.int().nonnegative(),
  }),
  categories: z.record(z.string(), countSchema),
  parse: z.record(z.string(), parseStatsSchema),
  icons: z.strictObject({
    total_clusters: z.int().nonnegative(),
    total_occurrences: z.int().nonnegative(),
    decor: z.int().nonnegative(),
    component_only: z.int().nonnegative(),
    likely_art: z.int().nonnegative(),
    clusters_for_80pct: z.int().nonnegative(),
    clusters_for_90pct: z.int().nonnegative(),
    to_annotate: z.int().nonnegative(),
    to_annotate_occurrences: z.int().nonnegative(),
    clusters_for_95pct: z.int().nonnegative(),
    to_annotate_ge3: z.int().nonnegative(),
    to_annotate_singletons: z.int().nonnegative(),
    decor_reasons: z.record(z.string(), z.int().nonnegative()),
  }),
});

export type ExtractSummary = z.infer<typeof extractSummarySchema>;

/** `reports/reconciliation.json`。与规则书部件清单的对账，不另建证据链。 */
export const reconciliationReportSchema = z.array(
  z.strictObject({
    rulebook_item: z.string().min(1),
    rulebook_count: z.int().nonnegative(),
    extracted_from: z.string().min(1),
    pages: z.int().nonnegative(),
    unique: z.int().nonnegative().nullable(),
    copies_total: z.int().nonnegative(),
    match: z.boolean(),
    explanation: z.string(),
  }),
);

export type ReconciliationReport = z.infer<typeof reconciliationReportSchema>;
