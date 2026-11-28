import type { RawFile } from "../../shared/extract/raw";
import {
  WARRENS_PUNCHBOARD_BACK,
  WARRENS_PUNCHBOARD_FRONT,
  warrensPunchboardFileSchema,
} from "./punchboard";

/** Rubine path bbox from本地 PDF 量测；未核准前仅供卡图 map 接线。 */
const DIE_CUT: Record<
  "LEPER" | "ANTIQUARIAN",
  Record<"front" | "back", { diecutPt: readonly [number, number, number, number] }>
> = {
  LEPER: {
    front: { diecutPt: [38.94, 36.65, 217.65, 274.64] },
    back: { diecutPt: [235.37, 36.65, 414.08, 274.64] },
  },
  ANTIQUARIAN: {
    front: { diecutPt: [235.37, 36.65, 414.08, 274.64] },
    back: { diecutPt: [38.94, 36.65, 217.65, 274.64] },
  },
};

const DIE_WH: readonly [number, number] = [178.71, 237.99];

const GEOMETRY_PENDING = "Q-WARRENS-22：Warrens 立牌 Rubine bbox 待印核（量测 178.71×237.99pt）";

const COMPONENTS = [
  ["leper", "LEPER"],
  ["antiquarian", "ANTIQUARIAN"],
] as const;

export function buildWarrensPunchboard(raw: RawFile) {
  if (raw.category !== "punchboard" || raw.n_unique !== 1 || raw.cards.length !== 1)
    throw new Error("需要完整 Warrens punchboard raw（单张双面冲压板）");
  const card = raw.cards[0]!;
  if (
    card.id !== "punchboard:warrens:p001" ||
    card.faces.front.file !== WARRENS_PUNCHBOARD_FRONT ||
    card.faces.back?.file !== WARRENS_PUNCHBOARD_BACK ||
    card.faces.front.page !== 1 ||
    card.faces.back?.page !== 1
  )
    throw new Error("Warrens punchboard 来源与 canonical ID 不符");
  const trim = card.faces.front.trim_mm;
  if (!trim || trim[0] !== 145 || trim[1] !== 95)
    throw new Error("Warrens punchboard trim_mm 与印刷不符");
  const frontLines = new Set(
    card.faces.front.lines.map((line) => line.text.replace(/\s+/g, " ").trim()),
  );
  const backLines = new Set(
    card.faces.back?.lines.map((line) => line.text.replace(/\s+/g, " ").trim()) ?? [],
  );
  if (!frontLines.has("LEPER") || !frontLines.has("ANTIQUARIAN"))
    throw new Error("Warrens punchboard FRONT 缺少 LEPER / ANTIQUARIAN 印刷标签");
  if (!backLines.has("LEPER") || !backLines.has("ANTIQUARIAN"))
    throw new Error("Warrens punchboard BACK 缺少 LEPER / ANTIQUARIAN 印刷标签");

  const source = {
    front: WARRENS_PUNCHBOARD_FRONT,
    back: WARRENS_PUNCHBOARD_BACK,
    page: 1 as const,
  };
  const components = COMPONENTS.flatMap(([slug, hero]) =>
    (["front", "back"] as const).map((face) => {
      const die = DIE_CUT[hero][face];
      return {
        id: `punchboard_component:warrens:p001:${slug}:${face}`,
        sheetId: "punchboard:warrens:p001",
        kind: "hero_standee" as const,
        hero,
        face,
        printedLabel: hero,
        source,
        diecutPt: [...die.diecutPt],
        diecutWhPt: [...DIE_WH],
        geometryVerified: false as const,
        pendingReview: [GEOMETRY_PENDING],
      };
    }),
  );

  return warrensPunchboardFileSchema.parse({
    schema: "ddbg-warrens-punchboard-v0",
    sheet: {
      id: "punchboard:warrens:p001",
      trimMm: [145, 95],
      source,
      geometryVerified: false,
    },
    components,
  });
}
