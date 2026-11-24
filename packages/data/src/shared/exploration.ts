import { z } from "zod";

export const explorationFaceSchema = z.enum([
  "curio",
  "rubble",
  "hunger",
  "blank",
  "trap",
  "darkness",
]);
export type ExplorationFace = z.infer<typeof explorationFaceSchema>;
export const explorationDieSchema = z
  .object({
    source: z.object({ file: z.string(), page: z.literal(1) }),
    rulesPages: z.tuple([z.literal(14), z.literal(15)]),
    faces: z.array(explorationFaceSchema).length(6),
  })
  .refine((value) => new Set(value.faces).size === 6, "六种骰面各一面");
