import { z } from "zod";
import type { RawFile } from "../extract/raw";
import { levelSchema } from "../extract/common";
import type { IconDictionary } from "../dictionary/schema";
import { createIconLookup, finishVerification, noteIcon, resolveLines } from "./icons";
import { normalizedIconSchema, verificationSchema } from "./schema";

const STAT_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_100x180_Hero_STAT_FRONT.pdf";
const STAT_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_100x180_Hero_STAT_BACK.pdf";

/** TDH 免疫栏标题装饰；不入词典，不参与 STAT 核实（R-048 / Q-105）。 */
const STAT_IMMUNITIES_HEADER_ICON = "55a3fded25";

const coveAttributesSchema = z.strictObject({
  rawId: z.string().regex(/^hero_stat:cove:(flagellant|man-at-arms):p00[12]$/),
  face: z.enum(["front", "back"]),
  name: z.enum(["FLAGELLANT", "MAN-AT-ARMS"]),
  level: levelSchema,
  life: z.int().positive(),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
});

/** R-105：Cove 六面 STAT（Cove 包 p1–4；Speed 缺印为 0，MAA 用移动栏核实为 1）。 */
export const approvedCoveHeroStats = [
  ["hero_stat:cove:flagellant:p001", "front", "FLAGELLANT", 1, 12, 2, 0],
  ["hero_stat:cove:flagellant:p001", "back", "FLAGELLANT", 2, 16, 3, 0],
  ["hero_stat:cove:flagellant:p002", "front", "FLAGELLANT", 3, 22, 3, 0],
  ["hero_stat:cove:man-at-arms:p001", "front", "MAN-AT-ARMS", 1, 16, 1, 1],
  ["hero_stat:cove:man-at-arms:p001", "back", "MAN-AT-ARMS", 2, 22, 2, 1],
  ["hero_stat:cove:man-at-arms:p002", "front", "MAN-AT-ARMS", 3, 28, 3, 1],
].map(([rawId, face, name, level, life, dodge, speed]) =>
  coveAttributesSchema.parse({ rawId, face, name, level, life, dodge, speed }),
);

export const coveHeroStatCardSchema = coveAttributesSchema
  .extend({
    id: z.string().regex(/^hero_stat:cove:(flagellant|man-at-arms):p00[12]:(front|back)$/),
    source: z.strictObject({
      file: z.enum([STAT_FRONT, STAT_BACK]),
      page: z.int().positive(),
    }),
    attributesVerified: z.literal(true),
    approval: z.literal("kyries_review_2026-10-24"),
    lines: z.array(z.string()),
    icons: z.array(normalizedIconSchema),
    verification: verificationSchema,
  })
  .strict();

export type CoveHeroStatCard = z.infer<typeof coveHeroStatCardSchema>;

export function buildCoveHeroStats(
  raw: RawFile,
  dictionary: IconDictionary,
  approved = approvedCoveHeroStats,
): CoveHeroStatCard[] {
  if (raw.category !== "hero_stat") throw new Error("Cove 英雄属性来源类别错误");
  const lookup = createIconLookup(dictionary);
  return approved.map((entry) => {
    const attributes = coveAttributesSchema.parse(entry);
    const sources = raw.cards.filter((card) => card.id === attributes.rawId);
    if (sources.length !== 1) throw new Error(`Cove 获批 raw id 必须唯一存在：${attributes.rawId}`);
    const source = sources[0]!;
    const face = source.faces[attributes.face];
    const expectedFile = attributes.face === "front" ? STAT_FRONT : STAT_BACK;
    if (
      !face ||
      face.file !== expectedFile ||
      source.pages.length !== 1 ||
      !face.spans.some((span) => span.t === attributes.name) ||
      !face.spans.some((span) => span.t === ["I", "II", "III"][attributes.level - 1])
    )
      throw new Error(`Cove 获批属性来源身份漂移：${attributes.rawId}:${attributes.face}`);
    const printedNumber = (iconId: string, expected: number) => {
      const placements = face.icons.filter((icon) => icon.iconId === iconId && !icon.decor);
      if (placements.length !== 1) throw new Error("Cove 属性数字定位不唯一");
      const [left, top, right, bottom] = placements[0]!.bbox;
      const numbers = face.spans.filter((span) => {
        const x = (span.bbox[0] + span.bbox[2]) / 2;
        const y = (span.bbox[1] + span.bbox[3]) / 2;
        return /^\d+$/.test(span.t) && x >= left && x <= right && y >= top && y <= bottom;
      });
      if (numbers.length !== 1 || numbers[0]!.t !== String(expected))
        throw new Error("Cove 获批属性与原始卡面数字冲突");
      return placements[0]!.bbox;
    };
    const lifeBox = printedNumber("9534ad5184", attributes.life);
    printedNumber("7a472f5d6f", attributes.dodge);
    const hamletLine = face.lines.findIndex((line) => line.text.startsWith("Hamlet Skill:"));
    const attributeLines = hamletLine < 0 ? face.lines : face.lines.slice(0, hamletLine);
    const reasons = new Set<string>();
    resolveLines(
      attributeLines
        .map((line) => line.text)
        .filter((line) => !line.includes("Resistances        Immunities")),
      lookup,
      reasons,
    );
    const icons = face.icons
      .filter((placement) => !placement.decor)
      .map((placement) => {
        const icon = lookup.resolve(placement.iconId);
        if (placement.iconId !== STAT_IMMUNITIES_HEADER_ICON) noteIcon(icon, reasons);
        return { ...icon, bbox: placement.bbox };
      });
    if (attributes.name === "MAN-AT-ARMS" && attributes.level === 1 && attributes.speed > 0) {
      const speedCount = face.icons.filter((placement) => {
        if (placement.decor || placement.iconId !== "4648c9e5ec") return false;
        const y = (placement.bbox[1] + placement.bbox[3]) / 2;
        return placement.bbox[0] >= lifeBox[2] && y >= lifeBox[1] && y <= lifeBox[3];
      }).length;
      if (speedCount !== attributes.speed) throw new Error("Cove MAA I Speed 与移动栏图标数量冲突");
    } else if (attributes.name === "FLAGELLANT" && attributes.speed !== 0) {
      throw new Error("Cove Flagellant Speed 与获批不一致");
    }
    for (const [iconId, key] of [
      ["9534ad5184", "life"],
      ["7a472f5d6f", "dodge"],
    ] as const) {
      const icon = icons.find((i) => i.iconId === iconId);
      if (!icon || icon.key !== key || !["confirmed", "confirmed_rulebook"].includes(icon.naming))
        throw new Error("Cove 获批属性缺少已确认图标（R-048）");
    }
    if (attributes.name === "MAN-AT-ARMS" && attributes.speed > 0) {
      const speedIcon = icons.find((i) => i.iconId === "4648c9e5ec");
      if (
        !speedIcon ||
        speedIcon.key !== "speed" ||
        !["confirmed", "confirmed_rulebook"].includes(speedIcon.naming)
      )
        throw new Error("Cove MAA Speed 缺少已确认图标（R-048）");
    }
    return coveHeroStatCardSchema.parse({
      ...attributes,
      id: `${attributes.rawId}:${attributes.face}`,
      source: { file: face.file, page: face.page },
      attributesVerified: true,
      approval: "kyries_review_2026-10-24",
      lines: face.lines.map((line) => line.text),
      icons: icons.map((entry) => {
        const { bbox, ...icon } = entry;
        void bbox;
        return icon;
      }),
      verification: finishVerification(reasons),
    });
  });
}
