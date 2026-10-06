import { z } from "zod";

/** 占位。英雄、技能、怪物等 JSON schema 在 Phase 1 再加。 */
export const placeholderRecordSchema = z.object({
  id: z.string().min(1),
});

export type PlaceholderRecord = z.infer<typeof placeholderRecordSchema>;
