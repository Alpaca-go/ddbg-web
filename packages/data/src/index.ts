import { z } from "zod";

/** 占位。规范化后的英雄、技能、怪物 schema 仍待后续步骤。 */
export const placeholderRecordSchema = z.object({
  id: z.string().min(1),
});

export type PlaceholderRecord = z.infer<typeof placeholderRecordSchema>;

export {
  bboxSchema,
  copyVariantSchema,
  iconIdSchema,
  iconRefSchema,
  levelSchema,
  pageListSchema,
  quarterTurnSchema,
  unlabeledNumberSchema,
} from "./extract/common";
export { RAW_CARD_CATEGORIES, RAW_SHEET_CATEGORIES, rawFileSchema } from "./extract/raw";
export type { RawFile } from "./extract/raw";
export { extractSummarySchema, reconciliationReportSchema } from "./extract/reports";
export type { ExtractSummary, ReconciliationReport } from "./extract/reports";
